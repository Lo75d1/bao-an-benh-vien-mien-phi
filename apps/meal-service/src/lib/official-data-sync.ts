import { createHash } from "node:crypto";
import type { DataSyncSource, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const SOURCE_LABEL: Record<DataSyncSource, string> = {
  VDD_FOOD: "Viện Dinh dưỡng · thực phẩm",
  VDD_DISH: "Viện Dinh dưỡng · món ăn",
  RNI_DISH: "Thực đơn gia đình · món dùng sẵn",
};

const VDD_HEADERS = { Accept: "application/json, text/plain, */*", "User-Agent": "Mozilla/5.0", Referer: "https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an" };
const RNI_HEADERS = { Accept: "application/json, text/plain, */*", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", Referer: "https://app.thucdongiadinh.vn/app/xay-dung-khau-phan/nbt-xay-dung-thuc-don" };
const DEFAULT_RETRY_DELAYS_MS = [1_000, 2_000] as const;
export const RNI_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000] as const;
export const RNI_SYNC_PAGE_SIZE = 1;
export const RNI_ITEM_DELAY_MIN_MS = 700;
export const RNI_ITEM_DELAY_MAX_MS = 1_200;

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const stableId = (prefix: string, code: string) => `${prefix}_${createHash("sha256").update(code).digest("hex").slice(0, 24)}`;
const numberOrNull = (value: unknown) => { const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", ".")); return Number.isFinite(parsed) ? parsed : null; };
const json = (value: unknown) => value as Prisma.InputJsonValue;

class HttpResponseError extends Error {
  constructor(public readonly status: number, public readonly retryAfterMs: number | null) {
    super(`HTTP ${status}`);
  }
}

export function rniItemDelayMs(random = Math.random()) {
  const bounded = Math.min(1, Math.max(0, random));
  return Math.floor(RNI_ITEM_DELAY_MIN_MS + bounded * (RNI_ITEM_DELAY_MAX_MS - RNI_ITEM_DELAY_MIN_MS));
}

export function retryDelayMs(configuredDelayMs: number, retryAfterMs?: number | null) {
  return Math.max(configuredDelayMs, retryAfterMs ?? 0);
}

function retryAfterMs(response: Response) {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

function shouldRetry(error: unknown) {
  return !(error instanceof HttpResponseError) || error.status === 403 || error.status === 429 || error.status >= 500;
}

async function fetchJson(url: string, init?: RequestInit, retryDelaysMs: readonly number[] = DEFAULT_RETRY_DELAYS_MS): Promise<Record<string, unknown>> {
  let last: unknown;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000), cache: "no-store" });
      if (!response.ok) throw new HttpResponseError(response.status, retryAfterMs(response));
      return await response.json() as Record<string, unknown>;
    } catch (error) {
      last = error;
      if (attempt >= retryDelaysMs.length || !shouldRetry(error)) break;
      const delay = retryDelayMs(retryDelaysMs[attempt], error instanceof HttpResponseError ? error.retryAfterMs : null);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw last instanceof Error ? last : new Error("Nguồn dữ liệu không phản hồi.");
}

function array(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : []; }
function text(value: unknown): string { return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim(); }
function nutrient(rows: Array<Record<string, unknown>>, keys: string[], valueKey: "value" | "amount") {
  const wanted = keys.map(normalize);
  const row = rows.find((item) => wanted.some((key) => normalize(text(item.name)).includes(key)));
  return row ? numberOrNull(row[valueKey]) : null;
}

async function vddPage(source: "VDD_FOOD" | "VDD_DISH", page: number, pageSize = 100) {
  const food = source === "VDD_FOOD";
  const url = new URL(food ? "https://viendinhduong.vn/api/fe/foodNatunal/getPageFoodData" : "https://viendinhduong.vn/api/fe/tool/getPageFoodData");
  url.searchParams.set("page", String(page)); url.searchParams.set("pageSize", String(pageSize)); url.searchParams.set(food ? "energy" : "gender", food ? "0" : "2");
  return fetchJson(url.toString(), { headers: VDD_HEADERS });
}

async function rniPage(skipCount: number, maxResultCount = RNI_SYNC_PAGE_SIZE) {
  const response = await fetchJson("https://app.thucdongiadinh.vn/api/services/app/MonAn/GetAllServerPaging", { method: "POST", headers: RNI_HEADERS, body: JSON.stringify({ keyword: "", isActive: true, arrNhomMonAnId: [], sorting: "", skipCount, maxResultCount }) }, RNI_RETRY_DELAYS_MS);
  return (response.result && typeof response.result === "object" ? response.result : {}) as Record<string, unknown>;
}

export async function previewOfficialSource(source: DataSyncSource) {
  const page = source === "RNI_DISH" ? await rniPage(0, 10) : await vddPage(source, 1, 10);
  const items = array(source === "RNI_DISH" ? page.items : page.data);
  const total = Number(source === "RNI_DISH" ? page.totalCount : page.total) || items.length;
  return { source, label: SOURCE_LABEL[source], officialUrl: source === "RNI_DISH" ? "https://thucdongiadinh.vn/" : "https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an", total, samples: items.slice(0, 5).map((item) => ({ code: text(item.code ?? item.id), name: text(item.name_vi ?? item.tenVi), energyKcal: numberOrNull(item.energy ?? item.total_energy ?? item.nangLuongKcal) })) };
}

export async function createSyncPreview(source: DataSyncSource, actor: { id: string }) {
  const preview = await previewOfficialSource(source);
  return prisma.dataSyncJob.create({ data: { source, requestedById: actor.id, previewJson: json(preview) } });
}

export async function queueSyncJob(id: string, reason: string, actor: { id: string; displayName: string }) {
  const cleanReason = reason.trim();
  if (cleanReason.length < 5) throw new Error("Cần nêu lý do cập nhật dữ liệu với ít nhất 5 ký tự.");
  return prisma.$transaction(async (tx) => {
    const job = await tx.dataSyncJob.findFirst({ where: { id, requestedById: actor.id, status: "PREVIEW" } });
    if (!job) throw new Error("Bản xem trước không còn hợp lệ.");
    if (job.source === "RNI_DISH") {
      const active = await tx.dataSyncJob.findFirst({ where: { id: { not: id }, source: "RNI_DISH", status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
      if (active) throw new Error("Đang có một tác vụ RNI khác chạy. Vui lòng chờ hoàn tất rồi thử lại.");
    }
    const queued = await tx.dataSyncJob.update({ where: { id }, data: { status: "QUEUED", reason: cleanReason } });
    await tx.auditLog.create({ data: { entityType: "DataSyncJob", entityId: id, action: "OFFICIAL_DATA_SYNC_QUEUED", actorId: actor.id, actorName: actor.displayName, afterJson: { source: job.source, status: "QUEUED" }, reason: cleanReason } });
    return queued;
  }, { isolationLevel: "Serializable" });
}

export async function retrySyncJob(id: string, actor: { id: string; displayName: string }) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.dataSyncJob.findFirst({ where: { id, status: "FAILED" } });
    if (!job) throw new Error("Tác vụ không ở trạng thái có thể chạy lại.");
    if (job.source === "RNI_DISH") {
      const active = await tx.dataSyncJob.findFirst({ where: { id: { not: id }, source: "RNI_DISH", status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
      if (active) throw new Error("Đang có một tác vụ RNI khác chạy. Vui lòng chờ hoàn tất rồi thử lại.");
    }
    const queued = await tx.dataSyncJob.update({ where: { id }, data: { status: "QUEUED", errorMessage: null, completedAt: null } });
    await tx.auditLog.create({ data: { entityType: "DataSyncJob", entityId: id, action: "OFFICIAL_DATA_SYNC_RETRY", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: "FAILED" }, afterJson: { status: "QUEUED", checkpoint: job.checkpointJson ?? undefined }, reason: "Chạy lại từ điểm dừng gần nhất" } });
    return queued;
  }, { isolationLevel: "Serializable" });
}

async function upsertVddFood(item: Record<string, unknown>) {
  const source = "VDD"; const code = text(item.code); const nameVi = text(item.name_vi); if (!code || !nameVi) return "skipped" as const;
  const nameEn = text(item.name_en); const nutrition = array(item.nutrition);
  const data = { name: nameEn ? `${nameVi} (${nameEn})` : nameVi, nameNormalized: normalize(nameVi), source, sourceCode: code, sourceNote: "Viện Dinh dưỡng Quốc gia", foodGroup: text(item.category) || null, energyKcal: numberOrNull(item.energy), proteinG: nutrient(nutrition, ["protein", "chất đạm", "đạm"], "value"), lipidG: nutrient(nutrition, ["lipid", "chất béo", "béo"], "value"), glucidG: nutrient(nutrition, ["glucid", "carbohydrate", "bột đường"], "value"), sodiumMg: nutrient(nutrition, ["natri", "sodium"], "value"), potassiumMg: nutrient(nutrition, ["kali", "potassium"], "value"), waterG: nutrient(nutrition, ["nước", "water"], "value"), rawJson: json(item) };
  const existing = await prisma.food.findFirst({ where: { source, sourceCode: code }, select: { id: true } });
  if (existing) { await prisma.food.update({ where: { id: existing.id }, data }); return "updated" as const; }
  await prisma.food.create({ data: { id: stableId("vdd_food", code), ...data } }); return "created" as const;
}

async function upsertDish(source: "VDD" | "RNI", item: Record<string, unknown>) {
  const code = text(item.code ?? item.id); const nameVi = text(item.name_vi ?? item.tenVi); if (!code || !nameVi) return { result: "skipped" as const, dishId: null };
  const data = { name: nameVi, nameNormalized: normalize(nameVi), source, sourceCode: code, totalWeightG: numberOrNull(item.khoiLuongAuto), servingUnit: text((item.kickThuocKhauPhanMacDinh as Record<string, unknown> | undefined)?.tenDonVi) || null, isActive: item.isActive !== false, rawJson: json(item) };
  const existing = await prisma.dish.findFirst({ where: { source, sourceCode: code }, select: { id: true } });
  if (existing) { await prisma.dish.update({ where: { id: existing.id }, data }); return { result: "updated" as const, dishId: existing.id }; }
  const dishId = stableId(source === "VDD" ? "vdd_dish" : "rni_dish", code); await prisma.dish.create({ data: { id: dishId, ...data } }); return { result: "created" as const, dishId };
}

async function syncRniIngredients(dishId: string, sourceCode: string) {
  const url = new URL("https://app.thucdongiadinh.vn/api/services/app/MonAn/GetAllTpFromMa"); url.searchParams.set("MonAnId", sourceCode);
  const response = await fetchJson(url.toString(), { headers: RNI_HEADERS }, RNI_RETRY_DELAYS_MS); const rows = array(response.result);
  for (const [index, row] of rows.entries()) {
    const food = row.thucPham && typeof row.thucPham === "object" ? row.thucPham as Record<string, unknown> : {};
    const rawFoodId = text(row.thucPhamId); const foodName = text(food.tenThucPhamVi); const quantityG = numberOrNull(row.khoiLuongGam ?? row.khoiLuong);
    if (!foodName || quantityG === null || quantityG <= 0) continue;
    const linked = rawFoodId ? await prisma.food.findFirst({ where: { OR: [{ source: "RNI", sourceCode: rawFoodId }, { nameNormalized: normalize(foodName) }] }, select: { id: true } }) : null;
    const id = stableId("rni_ing", `${sourceCode}:${rawFoodId || normalize(foodName)}:${index}`);
    await prisma.dishIngredient.upsert({ where: { id }, create: { id, dishId, foodId: linked?.id, foodNameRaw: foodName, quantityG, sortOrder: index, energyKcalRaw: numberOrNull(food.nangLuongKcal) }, update: { foodId: linked?.id, foodNameRaw: foodName, quantityG, sortOrder: index, energyKcalRaw: numberOrNull(food.nangLuongKcal) } });
  }
}

export async function processSyncJob(jobId: string) {
  const claimed = await prisma.dataSyncJob.updateMany({ where: { id: jobId, status: "QUEUED" }, data: { status: "RUNNING", startedAt: new Date(), completedAt: null, errorMessage: null } });
  if (!claimed.count) return;
  const job = await prisma.dataSyncJob.findUniqueOrThrow({ where: { id: jobId }, include: { requestedBy: { select: { displayName: true } } } });
  let processed = job.processedCount; let created = job.createdCount; let updated = job.updatedCount;
  try {
    if (job.source === "VDD_FOOD" || job.source === "VDD_DISH") {
      let pageNumber = Number((job.checkpointJson as { page?: number } | null)?.page ?? 1); let lastPage = pageNumber;
      do {
        const page = await vddPage(job.source, pageNumber); const items = array(page.data); lastPage = Number(page.last_page) || Math.max(1, Math.ceil((Number(page.total) || items.length) / 100));
        for (const item of items) { const result = job.source === "VDD_FOOD" ? await upsertVddFood(item) : (await upsertDish("VDD", item)).result; processed += 1; if (result === "created") created += 1; if (result === "updated") updated += 1; }
        pageNumber += 1; await prisma.dataSyncJob.update({ where: { id: job.id }, data: { processedCount: processed, createdCount: created, updatedCount: updated, checkpointJson: { page: pageNumber, lastPage } } });
        await new Promise((resolve) => setTimeout(resolve, 300));
      } while (pageNumber <= lastPage);
    } else {
      let skip = Number((job.checkpointJson as { skip?: number } | null)?.skip ?? 0); let total = skip + 1;
      while (skip < total) {
        const page = await rniPage(skip); const items = array(page.items); total = Number(page.totalCount) || items.length;
        if (!items.length) break;
        for (const [index, item] of items.entries()) {
          const saved = await upsertDish("RNI", item); processed += 1; if (saved.result === "created") created += 1; if (saved.result === "updated") updated += 1;
          if (saved.dishId) await syncRniIngredients(saved.dishId, text(item.id));
          const nextSkip = skip + index + 1;
          await prisma.dataSyncJob.update({ where: { id: job.id }, data: { processedCount: processed, createdCount: created, updatedCount: updated, checkpointJson: { skip: nextSkip, total } } });
          await new Promise((resolve) => setTimeout(resolve, rniItemDelayMs()));
        }
        skip += items.length;
      }
    }
    await prisma.$transaction([prisma.dataSyncJob.update({ where: { id: job.id }, data: { status: "COMPLETED", completedAt: new Date(), processedCount: processed, createdCount: created, updatedCount: updated } }), prisma.auditLog.create({ data: { entityType: "DataSyncJob", entityId: job.id, action: "OFFICIAL_DATA_SYNC_COMPLETED", actorId: job.requestedById, actorName: job.requestedBy.displayName, afterJson: { source: job.source, processed, created, updated }, reason: job.reason ?? "Đồng bộ dữ liệu chính thức" } })]);
  } catch (error) {
    await prisma.dataSyncJob.update({ where: { id: job.id }, data: { status: "FAILED", completedAt: new Date(), errorMessage: error instanceof Error ? error.message.slice(0, 1000) : "Lỗi không xác định", processedCount: processed, createdCount: created, updatedCount: updated } });
  }
}

export async function processNextSyncJob() {
  const job = await prisma.dataSyncJob.findFirst({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (job) await processSyncJob(job.id);
  return Boolean(job);
}
