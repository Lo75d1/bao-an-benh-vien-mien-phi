import { buildKitchenShoppingList, type MealQuantity, type SnapshotMenuItem } from "@suat-an/nutrition-engine";
import type { DietMealStatus, EvidenceKind, Prisma } from "@prisma/client";
import { evidenceStorage } from "./evidence-storage";
import { prisma } from "./prisma";
import { servingTotal } from "./late-addition";
import { readApprovedKitchenNotes } from "./patient-note";
import { readOperationalSettings } from "./settings";

export function hasActionableKitchenWork(input: {
  reportQuantities: number[];
  additions: Array<{ quantity: number; ackStatus: string }>;
}): boolean {
  return input.reportQuantities.some((quantity) => quantity > 0)
    || input.additions.some((addition) => addition.quantity > 0 && ["PENDING", "RECEIVED", "SUBSTITUTE"].includes(addition.ackStatus));
}

export const KITCHEN_STATUS_LABEL: Record<DietMealStatus, string> = { PLANNED: "Đã lên kế hoạch", LOCKED: "Đã chốt suất", PREPARING: "Đang chuẩn bị", PREPARED: "Đã chuẩn bị", SERVED: "Đã phục vụ", CANCELLED: "Đã hủy" };
const NEXT_STATUS: Partial<Record<DietMealStatus, DietMealStatus>> = { PLANNED: "PREPARING", LOCKED: "PREPARING", PREPARING: "PREPARED", PREPARED: "SERVED" };
export function nextKitchenStatus(status: DietMealStatus): DietMealStatus | null { return NEXT_STATUS[status] ?? null; }
export function assertKitchenTransition(from: DietMealStatus, to: DietMealStatus): void { if (nextKitchenStatus(from) !== to) throw new Error(`Không thể chuyển trạng thái từ ${from} sang ${to}.`); }

type CurrentSnapshot = { items?: unknown };
type CurrentItem = { foodId?: unknown; itemName?: unknown; grams?: unknown; wastePercent?: unknown };
export function buildDietMealShopping(input: Array<{ id: string; dietTypeId: string; dietName: string; servingsPlanned: number; menuSnapshotJson: unknown }>) {
  const menuItems: SnapshotMenuItem[] = []; const quantities: MealQuantity[] = []; const warnings: string[] = []; const mealTypeId = "kitchen-event";
  for (const meal of input) {
    if (!Number.isInteger(meal.servingsPlanned) || meal.servingsPlanned <= 0) { warnings.push(`${meal.dietName}: thiếu số suất hợp lệ; không tính số mua.`); continue; }
    quantities.push({ mealTypeId, dietTypeId: meal.dietTypeId, quantity: meal.servingsPlanned });
    const snapshot = meal.menuSnapshotJson as CurrentSnapshot | null;
    if (!snapshot || !Array.isArray(snapshot.items)) { warnings.push(`${meal.dietName}: chưa có snapshot thực đơn hợp lệ; số mua để “—”.`); continue; }
    const foods = (snapshot.items as CurrentItem[]).flatMap((item) => {
      const grams = Number(item?.grams); const name = typeof item?.itemName === "string" ? item.itemName : "Thực phẩm chưa xác định";
      if (typeof item?.foodId !== "string" || !item.foodId || typeof item.itemName !== "string" || !Number.isFinite(grams) || grams <= 0) { warnings.push(`${meal.dietName}: “${name}” thiếu liên kết thực phẩm hoặc khối lượng; số mua để “—”.`); return []; }
      return [{ foodId: item.foodId, foodName: item.itemName, gramsPerServing: grams, wastePercent: typeof item.wastePercent === "number" ? item.wastePercent : null }];
    });
    menuItems.push({ id: meal.id, dietTypeId: meal.dietTypeId, dishName: meal.dietName, snapshotJson: { dishes: [{ dish: meal.dietName, foods }] } });
  }
  const result = buildKitchenShoppingList("next-meal", mealTypeId, menuItems, quantities);
  return { ...result, incomplete: [...result.incomplete, ...warnings.map((reason) => ({ menuItemId: "", dishName: "Dữ liệu thiếu", reason }))] };
}

export async function readNextKitchenMeal() {
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const events = await prisma.mealEvent.findMany({ where: { mealDate: { gte: new Date(`${localDate}T00:00:00.000Z`) }, OR: [{ dietMeals: { some: { voidedAt: null, status: { notIn: ["SERVED", "CANCELLED"] } } } }, { additions: { some: { ackStatus: "PENDING" } } }] }, orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }], take: 14, include: { mealType: true, additions: { orderBy: { submittedAt: "desc" }, include: { department: true, dietType: true } }, dietMeals: { where: { voidedAt: null }, orderBy: { dietType: { sortOrder: "asc" } }, select: { id: true, dietTypeId: true, feedingRoute: true, menuSnapshotJson: true, servingsPlanned: true, status: true, dietType: true, evidence: { orderBy: { uploadedAt: "desc" } } } } } });
  const event = events[0] ?? null; if (!event) return null;
  const shopping = buildDietMealShopping(event.dietMeals.map((meal) => ({ id: meal.id, dietTypeId: meal.dietTypeId, dietName: meal.dietType.name, servingsPlanned: servingTotal(meal.servingsPlanned, event.additions.filter((addition) => addition.dietTypeId === meal.dietTypeId)).total, menuSnapshotJson: meal.menuSnapshotJson })));
  return { ...event, shopping, evidence: event.dietMeals.flatMap((meal) => meal.evidence.map((item) => ({ ...item, dietName: meal.dietType.name, publicUrl: evidenceStorage.publicUrl(item.storagePath) }))) };
}

export { readApprovedKitchenNotes };

export async function transitionDietMeal(dietMealId: string, target: DietMealStatus, actor: { id: string; displayName: string }) {
  return prisma.$transaction(async (tx) => { const meal = await tx.dietMeal.findUnique({ where: { id: dietMealId }, select: { id: true, status: true, voidedAt: true } }); if (!meal || meal.voidedAt) throw new Error("Không tìm thấy bữa ăn đang hoạt động."); assertKitchenTransition(meal.status, target); const updated = await tx.dietMeal.update({ where: { id: meal.id }, data: { status: target } }); await tx.auditLog.create({ data: { entityType: "DietMeal", entityId: meal.id, action: "KITCHEN_STATUS_CHANGE", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: meal.status }, afterJson: { status: target }, reason: `Bếp chuyển trạng thái ${meal.status} → ${target}` } }); return updated; });
}

export async function storeMealEvidence(input: { dietMealId: string; kind: EvidenceKind; file: File; note: string | null }, actor: { id: string; displayName: string }) {
  const stored = await evidenceStorage.store(input.file); if (!stored) return { stored: false as const };
  await prisma.$transaction(async (tx) => { const meal = await tx.dietMeal.findFirst({ where: { id: input.dietMealId, voidedAt: null }, select: { id: true } }); if (!meal) throw new Error("Không tìm thấy bữa ăn đang hoạt động."); const evidence = await tx.mealEvidence.create({ data: { dietMealId: meal.id, kind: input.kind, storagePath: stored.storagePath, uploadedById: actor.id, note: input.note } }); await tx.auditLog.create({ data: { entityType: "MealEvidence", entityId: evidence.id, action: "UPLOAD", actorId: actor.id, actorName: actor.displayName, afterJson: { dietMealId: meal.id, kind: input.kind, storagePath: stored.storagePath } as Prisma.InputJsonValue, reason: "Bếp đính kèm bằng chứng bữa ăn" } }); }); return { stored: true as const };
}

export function missingMealPhotoIds(mealIds: string[], existingIds: string[], uploadedIds: string[]) {
  const available = new Set([...existingIds, ...uploadedIds]);
  return mealIds.filter((id) => !available.has(id));
}

export async function completeKitchenEvent(input: { eventId: string; feedingRoute: "NORMAL" | "SONDE"; dietMealIds: string[]; files: Array<{ dietMealId: string; file: File; note: string | null }> }, actor: { id: string; displayName: string }) {
  const meals = await prisma.dietMeal.findMany({ where: { mealEventId: input.eventId, feedingRoute: input.feedingRoute, voidedAt: null }, select: { id: true, status: true, evidence: { where: { kind: "MEAL_PHOTO" }, select: { id: true }, take: 1 } } });
  if (!meals.length || meals.length !== input.dietMealIds.length || meals.some((meal) => !input.dietMealIds.includes(meal.id))) throw new Error("Danh sách mã chế độ ăn không hợp lệ.");
  const missing = missingMealPhotoIds(meals.map((meal) => meal.id), meals.filter((meal) => meal.evidence.length).map((meal) => meal.id), input.files.map((item) => item.dietMealId));
  if (missing.length) throw new Error("Cần ảnh món thực tế cho tất cả mã chế độ ăn.");
  if (meals.some((meal) => !["PLANNED", "LOCKED", "PREPARING", "PREPARED"].includes(meal.status))) throw new Error("Bữa ăn không còn ở giai đoạn chuẩn bị.");
  const stored = [] as Array<{ dietMealId: string; storagePath: string; note: string | null }>;
  for (const item of input.files) {
    if (!item.file.type.startsWith("image/") || item.file.size <= 0 || item.file.size > 10 * 1024 * 1024) throw new Error("Mỗi mã cần một ảnh hợp lệ, tối đa 10 MB.");
    const result = await evidenceStorage.store(item.file);
    if (!result) return { stored: false as const };
    stored.push({ dietMealId: item.dietMealId, storagePath: result.storagePath, note: item.note });
  }
  await prisma.$transaction(async (tx) => {
    for (const item of stored) {
      const meal = meals.find((value) => value.id === item.dietMealId)!;
      const evidence = await tx.mealEvidence.create({ data: { dietMealId: meal.id, kind: "MEAL_PHOTO", storagePath: item.storagePath, uploadedById: actor.id, note: item.note } });
      await tx.auditLog.create({ data: { entityType: "MealEvidence", entityId: evidence.id, action: meal.evidence.length ? "REPLACE" : "UPLOAD", actorId: actor.id, actorName: actor.displayName, afterJson: { dietMealId: meal.id, kind: "MEAL_PHOTO", storagePath: item.storagePath }, reason: "Bếp lưu ảnh món thực tế" } });
    }
    for (const meal of meals.filter((item) => item.status !== "PREPARED")) {
      await tx.dietMeal.update({ where: { id: meal.id }, data: { status: "PREPARED" } });
      await tx.auditLog.create({ data: { entityType: "DietMeal", entityId: meal.id, action: "KITCHEN_BATCH_PREPARED", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: meal.status }, afterJson: { status: "PREPARED" }, reason: "Bếp xác nhận mã chế độ ăn đã sẵn sàng giao" } });
    }
  });
  return { stored: true as const };
}

export async function saveFoodRetentionEvidence(input: { eventId: string; feedingRoute: "NORMAL" | "SONDE"; file: File; note: string | null }, actor: { id: string; displayName: string }) {
  const settings = await readOperationalSettings();
  if (!settings.foodRetention24hRequired) throw new Error("Bệnh viện chưa bật yêu cầu lưu mẫu thực phẩm 24 giờ.");
  const event = await prisma.mealEvent.findFirst({ where: { id: input.eventId, mealType: { feedingRoute: input.feedingRoute }, dietMeals: { some: { feedingRoute: input.feedingRoute, voidedAt: null } } }, select: { id: true } });
  if (!event) throw new Error("Không tìm thấy bữa ăn thuộc phạm vi bếp này.");
  if (!input.file.type.startsWith("image/") || input.file.size <= 0 || input.file.size > 10 * 1024 * 1024) throw new Error("Cần một ảnh mẫu lưu hợp lệ, tối đa 10 MB.");
  const stored = await evidenceStorage.store(input.file); if (!stored) return { stored: false as const };
  await prisma.$transaction(async (tx) => {
    const evidence = await tx.mealEvidence.create({ data: { mealEventId: event.id, kind: "FOOD_SAMPLE", storagePath: stored.storagePath, uploadedById: actor.id, note: input.note } });
    await tx.auditLog.create({ data: { entityType: "MealEvent", entityId: event.id, action: "FOOD_RETENTION_24H", actorId: actor.id, actorName: actor.displayName, afterJson: { evidenceId: evidence.id, retainedAt: evidence.uploadedAt, retainUntil: new Date(evidence.uploadedAt.getTime() + 24 * 60 * 60 * 1000) }, reason: "Bếp ghi nhận mẫu lưu thực phẩm 24 giờ cho toàn bữa" } });
  });
  return { stored: true as const };
}

export async function reopenKitchenEvent(eventId: string, feedingRoute: "NORMAL" | "SONDE", actor: { id: string; displayName: string }) {
  await prisma.$transaction(async (tx) => {
    const meals = await tx.dietMeal.findMany({ where: { mealEventId: eventId, feedingRoute, voidedAt: null, status: "PREPARED" }, select: { id: true } });
    for (const meal of meals) {
      await tx.dietMeal.update({ where: { id: meal.id }, data: { status: "PREPARING" } });
      await tx.auditLog.create({ data: { entityType: "DietMeal", entityId: meal.id, action: "KITCHEN_REOPEN", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: "PREPARED" }, afterJson: { status: "PREPARING" }, reason: "Bếp quay lại chỉnh sửa trước giờ phục vụ" } });
    }
  });
}
