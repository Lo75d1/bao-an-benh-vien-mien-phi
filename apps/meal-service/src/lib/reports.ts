import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { parseMenuItems } from "./menu-logic";
import { buildDietMealShopping } from "./kitchen";

export const REPORT_CONTENTS = ["full", "servings", "additions", "menus", "evidence", "warehouse"] as const;
export type ReportContent = (typeof REPORT_CONTENTS)[number];
export type ReportFormat = "excel" | "pdf" | "print";
export type ReportCell = string | number;
export type ReportRow = Record<string, ReportCell | null | undefined>;
export type ReportSection = { title: string; columns: { key: string; label: string }[]; rows: Record<string, ReportCell>[] };
export type ReportData = ReportSection & { from: string; to: string; scope: string; sections?: ReportSection[] };
export type ReportActor = { id: string; role: Role };

const CONTENT_LABEL: Record<ReportContent, string> = { full: "Báo cáo vận hành đầy đủ", servings: "Báo suất theo khoa", additions: "Suất bổ sung", menus: "Thực đơn và dinh dưỡng", evidence: "Bằng chứng bếp", warehouse: "Nhập, xuất và điều chỉnh kho" };
const MISSING = "—";

export function parseReportRange(fromValue: string, toValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromValue) || !/^\d{4}-\d{2}-\d{2}$/.test(toValue)) throw new Error("Khoảng ngày không hợp lệ.");
  const from = new Date(`${fromValue}T00:00:00.000Z`);
  const to = new Date(`${toValue}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error("Từ ngày phải trước hoặc bằng đến ngày.");
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000);
  if (days > 366) throw new Error("Mỗi lần chỉ xuất tối đa 367 ngày.");
  return { from, to, fromValue, toValue };
}

export function parseReportContent(value: string): ReportContent {
  if (!REPORT_CONTENTS.includes(value as ReportContent)) throw new Error("Nội dung báo cáo không hợp lệ.");
  return value as ReportContent;
}

export function parseReportFormat(value: string): ReportFormat {
  if (!(["excel", "pdf", "print"] as const).includes(value as ReportFormat)) throw new Error("Định dạng xuất không hợp lệ.");
  return value as ReportFormat;
}

export function scopeDepartmentIds(role: Role, membershipIds: string[]) {
  return role === "NURSE" ? [...new Set(membershipIds)] : null;
}

export function normalizeReportRows(rows: ReportRow[], columns: ReportData["columns"]) {
  return rows.map((row) => Object.fromEntries(columns.map(({ key }) => {
    const value = row[key];
    return [key, value === null || value === undefined || value === "" ? MISSING : value];
  })) as Record<string, ReportCell>);
}

function dateCell(value: Date) { return value.toISOString().slice(0, 10); }
function dateTimeCell(value: Date | null) { return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(value) : null; }
function evaluationSummary(value: unknown) {
  if (!value || typeof value !== "object") return { energy: null, target: null, overall: null };
  const data = value as Record<string, unknown>;
  const criteria = Array.isArray(data.criteria) ? data.criteria : [];
  const energy = criteria.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).key === "energyKcal") as Record<string, unknown> | undefined;
  return { energy: typeof energy?.actual === "number" ? energy.actual : null, target: typeof energy?.target === "string" ? energy.target : null, overall: typeof data.overall === "string" ? data.overall : null };
}

async function readDailyOverview(range: ReturnType<typeof parseReportRange>, servings: ReportSection, additions: ReportSection): Promise<ReportSection> {
  const columns = [{ key: "date", label: "Ngày" }, { key: "base", label: "Suất gốc" }, { key: "additions", label: "Phát sinh bếp nhận" }, { key: "total", label: "Tổng phục vụ" }, { key: "departments", label: "Theo khoa" }, { key: "diets", label: "Theo mã chế độ" }, { key: "shoppingKg", label: "Cần mua/ngày (kg)" }];
  const days = new Map<string, { base: number; additions: number; departments: Map<string, number>; diets: Map<string, number>; shoppingGrams: number | null }>();
  const getDay = (date: string) => { const current = days.get(date) ?? { base: 0, additions: 0, departments: new Map<string, number>(), diets: new Map<string, number>(), shoppingGrams: 0 }; days.set(date, current); return current; };
  for (const row of servings.rows) { const date = String(row.date); const quantity = typeof row.quantity === "number" ? row.quantity : 0; const day = getDay(date); day.base += quantity; const department = String(row.department); const diet = String(row.diet); day.departments.set(department, (day.departments.get(department) ?? 0) + quantity); day.diets.set(diet, (day.diets.get(diet) ?? 0) + quantity); }
  for (const row of additions.rows) { if (!['RECEIVED', 'SUBSTITUTE'].includes(String(row.ack))) continue; const date = String(row.date); const quantity = typeof row.quantity === "number" ? row.quantity : 0; const day = getDay(date); day.additions += quantity; const department = String(row.department); const diet = String(row.diet); day.departments.set(department, (day.departments.get(department) ?? 0) + quantity); day.diets.set(diet, (day.diets.get(diet) ?? 0) + quantity); }
  const events = await prisma.mealEvent.findMany({ where: { mealDate: { gte: range.from, lte: range.to } }, orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }], select: { mealDate: true, additions: { where: { ackStatus: { in: ["RECEIVED", "SUBSTITUTE"] } }, select: { dietTypeId: true, quantity: true } }, dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, select: { id: true, dietTypeId: true, servingsPlanned: true, menuSnapshotJson: true, dietType: { select: { name: true } } } } } });
  for (const event of events) { const date = dateCell(event.mealDate); const day = getDay(date); const shopping = buildDietMealShopping(event.dietMeals.map((meal) => ({ id: meal.id, dietTypeId: meal.dietTypeId, dietName: meal.dietType.name, servingsPlanned: meal.servingsPlanned + event.additions.filter((item) => item.dietTypeId === meal.dietTypeId).reduce((sum, item) => sum + item.quantity, 0), menuSnapshotJson: meal.menuSnapshotJson }))); if (shopping.items.length === 0 || shopping.items.some((item) => item.rawGrams === null)) day.shoppingGrams = null; else if (day.shoppingGrams !== null) day.shoppingGrams += shopping.items.reduce((sum, item) => sum + item.rawGrams, 0); }
  const rows = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, day]) => ({ date, base: day.base || null, additions: day.additions || null, total: day.base || day.additions ? day.base + day.additions : null, departments: [...day.departments].map(([name, quantity]) => `${name}: ${quantity}`).join("; ") || null, diets: [...day.diets].map(([name, quantity]) => `${name}: ${quantity}`).join("; ") || null, shoppingKg: day.shoppingGrams === null || day.shoppingGrams === 0 ? null : Number((day.shoppingGrams / 1000).toFixed(2)) }));
  return { title: "Tổng quan theo ngày", columns, rows: normalizeReportRows(rows, columns) };
}

export async function readReport(content: ReportContent, range: ReturnType<typeof parseReportRange>, actor: ReportActor): Promise<ReportData> {
  const memberships = actor.role === "NURSE" ? await prisma.departmentMembership.findMany({ where: { userId: actor.id }, include: { department: { select: { id: true, name: true } } } }) : [];
  const departmentIds = scopeDepartmentIds(actor.role, memberships.map((item) => item.departmentId));
  const scope = departmentIds ? (memberships.length ? memberships.map((item) => item.department.name).join(", ") : "—") : "Toàn viện";
  const base = { title: CONTENT_LABEL[content], from: range.fromValue, to: range.toValue, scope };

  if (content === "full") {
    const contents: ReportContent[] = actor.role === "NURSE" ? ["servings", "additions", "menus", "evidence"] : ["servings", "additions", "menus", "evidence", "warehouse"];
    const reports = await Promise.all(contents.map((item) => readReport(item, range, actor)));
    const overview = await readDailyOverview(range, reports[0], reports[1]);
    return { ...base, columns: [], rows: [], sections: [overview, ...reports.map(({ title, columns, rows }) => ({ title, columns, rows }))] };
  }

  if (content === "servings") {
    const columns = [{ key: "date", label: "Ngày" }, { key: "meal", label: "Bữa" }, { key: "department", label: "Khoa" }, { key: "diet", label: "Chế độ" }, { key: "quantity", label: "Suất gốc" }, { key: "status", label: "Trạng thái báo" }, { key: "submittedAt", label: "Gửi lúc" }];
    const reports = await prisma.servingReport.findMany({ where: { mealEvent: { mealDate: { gte: range.from, lte: range.to } }, ...(departmentIds ? { departmentId: { in: departmentIds } } : {}) }, include: { department: true, mealEvent: { include: { mealType: true } }, lines: { include: { dietType: true } } }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { department: { name: "asc" } }] });
    const rows = reports.flatMap((report) => report.lines.map((line) => ({ date: dateCell(report.mealEvent.mealDate), meal: report.mealEvent.mealType.name, department: report.department.name, diet: `${line.dietType.code} — ${line.dietType.name}`, quantity: line.quantity, status: report.status, submittedAt: dateTimeCell(report.submittedAt) })));
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (content === "additions") {
    const columns = [{ key: "date", label: "Ngày" }, { key: "meal", label: "Bữa" }, { key: "department", label: "Khoa" }, { key: "diet", label: "Chế độ" }, { key: "quantity", label: "Suất bổ sung" }, { key: "kind", label: "Loại" }, { key: "ack", label: "Bếp xử lý" }, { key: "reason", label: "Lý do" }];
    const additions = await prisma.lateMealAddition.findMany({ where: { mealEvent: { mealDate: { gte: range.from, lte: range.to } }, ...(departmentIds ? { departmentId: { in: departmentIds } } : {}) }, include: { department: true, mealEvent: { include: { mealType: true } }, dietType: true }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { submittedAt: "asc" }] });
    const rows = additions.map((item) => ({ date: dateCell(item.mealEvent.mealDate), meal: item.mealEvent.mealType.name, department: item.department.name, diet: `${item.dietType.code} — ${item.dietType.name}`, quantity: item.quantity, kind: item.kind, ack: item.ackStatus, reason: item.reason }));
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (content === "menus") {
    const columns = [{ key: "date", label: "Ngày" }, { key: "meal", label: "Bữa" }, { key: "diet", label: "Mã chế độ" }, { key: "dishes", label: "Món ăn" }, { key: "foods", label: "Thực phẩm" }, { key: "energy", label: "kcal/suất" }, { key: "target", label: "Khuyến nghị" }, { key: "overall", label: "Đánh giá" }, { key: "approvedBy", label: "Người duyệt" }];
    const meals = await prisma.dietMeal.findMany({ where: { voidedAt: null, status: { not: "CANCELLED" }, mealEvent: { mealDate: { gte: range.from, lte: range.to } } }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { mealEvent: { mealType: { sortOrder: "asc" } } }, { dietType: { sortOrder: "asc" } }], select: { menuSnapshotJson: true, evaluationJson: true, approvedAt: true, approvedBy: { select: { displayName: true } }, dietType: { select: { code: true, name: true } }, mealEvent: { select: { mealDate: true, mealType: { select: { name: true } } } } } });
    const rows = meals.map((meal) => { const items = parseMenuItems(meal.menuSnapshotJson); const evaluation = evaluationSummary(meal.evaluationJson); return { date: dateCell(meal.mealEvent.mealDate), meal: meal.mealEvent.mealType.name, diet: `${meal.dietType.code} — ${meal.dietType.name}`, dishes: [...new Set(items.map((item) => item.dishName))].join(", ") || null, foods: items.map((item) => `${item.itemName} ${item.grams}g`).join("; ") || null, energy: evaluation.energy, target: evaluation.target, overall: evaluation.overall, approvedBy: meal.approvedAt ? meal.approvedBy?.displayName ?? null : null }; });
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (content === "evidence") {
    const columns = [{ key: "date", label: "Ngày" }, { key: "meal", label: "Bữa" }, { key: "diet", label: "Mã chế độ" }, { key: "kind", label: "Loại bằng chứng" }, { key: "status", label: "Tệp" }, { key: "note", label: "Ghi chú" }, { key: "uploadedBy", label: "Người lưu" }, { key: "uploadedAt", label: "Lưu lúc" }];
    const evidence = await prisma.mealEvidence.findMany({ where: { dietMeal: { voidedAt: null, mealEvent: { mealDate: { gte: range.from, lte: range.to } } } }, orderBy: [{ dietMeal: { mealEvent: { mealDate: "asc" } } }, { uploadedAt: "asc" }], select: { kind: true, note: true, uploadedAt: true, uploadedBy: { select: { displayName: true } }, dietMeal: { select: { dietType: { select: { code: true, name: true } }, mealEvent: { select: { mealDate: true, mealType: { select: { name: true } } } } } } } });
    const rows = evidence.map((item) => ({ date: dateCell(item.dietMeal.mealEvent.mealDate), meal: item.dietMeal.mealEvent.mealType.name, diet: `${item.dietMeal.dietType.code} — ${item.dietMeal.dietType.name}`, kind: item.kind === "MEAL_PHOTO" ? "Ảnh món ăn" : "Ảnh lưu mẫu", status: "Đã lưu", note: item.note, uploadedBy: item.uploadedBy.displayName, uploadedAt: dateTimeCell(item.uploadedAt) }));
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (actor.role === "NURSE") return { ...base, columns: [], rows: [] };
  const columns = [{ key: "occurredAt", label: "Thời điểm" }, { key: "warehouse", label: "Kho" }, { key: "type", label: "Loại" }, { key: "item", label: "Mặt hàng" }, { key: "quantity", label: "Số lượng" }, { key: "unit", label: "Đơn vị" }, { key: "unitPrice", label: "Đơn giá" }, { key: "status", label: "Trạng thái" }];
  const transactions = await prisma.inventoryTransaction.findMany({ where: { occurredAt: { gte: range.from, lte: range.to }, lines: { some: {} } }, include: { warehouse: true, lines: true }, orderBy: { occurredAt: "asc" } });
  const rows = transactions.flatMap((transaction) => transaction.lines.map((line) => ({ occurredAt: dateTimeCell(transaction.occurredAt), warehouse: transaction.warehouse.name, type: transaction.type, item: line.itemName, quantity: Number(line.quantity), unit: line.unit, unitPrice: line.unitPrice == null ? null : Number(line.unitPrice), status: transaction.status })));
  return { ...base, columns, rows: normalizeReportRows(rows, columns) };
}

export async function readAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 200) });
}
