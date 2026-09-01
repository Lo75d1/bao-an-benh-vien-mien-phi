import type { Role } from "@prisma/client";
import { DEFAULT_LOCALE, getTranslations, type Locale } from "./locale";
import { buildDietMealShopping } from "./kitchen";
import { parseMenuItems } from "./menu-logic";
import { prisma } from "./prisma";

export const REPORT_CONTENTS = ["full", "servings", "additions", "menus", "evidence", "warehouse"] as const;
export type ReportContent = (typeof REPORT_CONTENTS)[number];
export type ReportFormat = "excel" | "pdf" | "print";
export type ReportCell = string | number;
export type ReportRow = Record<string, ReportCell | null | undefined>;
export type ReportSection = { title: string; columns: { key: string; label: string }[]; rows: Record<string, ReportCell>[] };
export type ReportData = ReportSection & { from: string; to: string; scope: string; sections?: ReportSection[] };
export type ReportActor = { id: string; role: Role };

function labels(locale: Locale = DEFAULT_LOCALE) {
  return getTranslations(locale).management.reportsData;
}

function contentLabel(content: ReportContent, locale: Locale) {
  const t = labels(locale);
  return { full: t.contentFull, servings: t.contentServings, additions: t.contentAdditions, menus: t.contentMenus, evidence: t.contentEvidence, warehouse: t.contentWarehouse }[content];
}

export function parseReportRange(fromValue: string, toValue: string, locale: Locale = DEFAULT_LOCALE) {
  const t = labels(locale);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromValue) || !/^\d{4}-\d{2}-\d{2}$/.test(toValue)) throw new Error(t.invalidDateRange);
  const from = new Date(`${fromValue}T00:00:00.000Z`);
  const to = new Date(`${toValue}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error(t.invalidDateOrder);
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000);
  if (days > 366) throw new Error(t.maxRange);
  return { from, to, fromValue, toValue };
}

export function parseReportContent(value: string, locale: Locale = DEFAULT_LOCALE): ReportContent {
  if (!REPORT_CONTENTS.includes(value as ReportContent)) throw new Error(labels(locale).invalidContent);
  return value as ReportContent;
}

export function parseReportFormat(value: string, locale: Locale = DEFAULT_LOCALE): ReportFormat {
  if (!(["excel", "pdf", "print"] as const).includes(value as ReportFormat)) throw new Error(labels(locale).invalidFormat);
  return value as ReportFormat;
}

export function scopeDepartmentIds(role: Role, membershipIds: string[]) {
  return role === "NURSE" ? [...new Set(membershipIds)] : null;
}

export function normalizeReportRows(rows: ReportRow[], columns: ReportData["columns"]) {
  return rows.map((row) => Object.fromEntries(columns.map(({ key }) => {
    const value = row[key];
    return [key, value === null || value === undefined || value === "" ? "—" : value];
  })) as Record<string, ReportCell>);
}

function dateCell(value: Date) { return value.toISOString().slice(0, 10); }
function dateTimeCell(value: Date | null, locale: Locale) { return value ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(value) : null; }
function evaluationSummary(value: unknown) {
  if (!value || typeof value !== "object") return { energy: null, target: null, overall: null };
  const data = value as Record<string, unknown>;
  const criteria = Array.isArray(data.criteria) ? data.criteria : [];
  const energy = criteria.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).key === "energyKcal") as Record<string, unknown> | undefined;
  return { energy: typeof energy?.actual === "number" ? energy.actual : null, target: typeof energy?.target === "string" ? energy.target : null, overall: typeof data.overall === "string" ? data.overall : null };
}

async function readDailyOverview(range: ReturnType<typeof parseReportRange>, servings: ReportSection, additions: ReportSection, locale: Locale): Promise<{ overview: ReportSection; shopping: ReportSection }> {
  const t = labels(locale);
  const columns = [{ key: "date", label: t.date }, { key: "base", label: t.baseServings }, { key: "additions", label: t.receivedAdditions }, { key: "total", label: t.totalServed }, { key: "departments", label: t.byDepartment }, { key: "diets", label: t.byDietCode }];
  const shoppingColumns = [{ key: "date", label: t.date }, { key: "food", label: t.food }, { key: "edibleKg", label: t.edibleKg }, { key: "waste", label: t.waste }, { key: "purchaseKg", label: t.purchaseKg }];
  const days = new Map<string, { base: number; additions: number; departments: Map<string, number>; diets: Map<string, number> }>();
  const shoppingByFood = new Map<string, { date: string; food: string; edibleGrams: number; rawGrams: number | null; wastePercent: number | null }>();
  const getDay = (date: string) => { const current = days.get(date) ?? { base: 0, additions: 0, departments: new Map<string, number>(), diets: new Map<string, number>() }; days.set(date, current); return current; };
  for (const row of servings.rows) { const date = String(row.date); const quantity = typeof row.quantity === "number" ? row.quantity : 0; const day = getDay(date); day.base += quantity; const department = String(row.department); const diet = String(row.diet); day.departments.set(department, (day.departments.get(department) ?? 0) + quantity); day.diets.set(diet, (day.diets.get(diet) ?? 0) + quantity); }
  for (const row of additions.rows) { if (!["RECEIVED", "SUBSTITUTE"].includes(String(row.ack))) continue; const date = String(row.date); const quantity = typeof row.quantity === "number" ? row.quantity : 0; const day = getDay(date); day.additions += quantity; const department = String(row.department); const diet = String(row.diet); day.departments.set(department, (day.departments.get(department) ?? 0) + quantity); day.diets.set(diet, (day.diets.get(diet) ?? 0) + quantity); }
  const events = await prisma.mealEvent.findMany({ where: { mealDate: { gte: range.from, lte: range.to } }, orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }], select: { mealDate: true, additions: { where: { ackStatus: { in: ["RECEIVED", "SUBSTITUTE"] } }, select: { dietTypeId: true, quantity: true } }, dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, select: { id: true, dietTypeId: true, servingsPlanned: true, menuSnapshotJson: true, dietType: { select: { name: true } } } } } });
  for (const event of events) { const date = dateCell(event.mealDate); getDay(date); const shopping = buildDietMealShopping(event.dietMeals.map((meal) => ({ id: meal.id, dietTypeId: meal.dietTypeId, dietName: meal.dietType.name, servingsPlanned: meal.servingsPlanned + event.additions.filter((item) => item.dietTypeId === meal.dietTypeId).reduce((sum, item) => sum + item.quantity, 0), menuSnapshotJson: meal.menuSnapshotJson }))); for (const item of shopping.items) { const key = `${date}|${item.foodId}`; const current = shoppingByFood.get(key) ?? { date, food: item.foodName, edibleGrams: 0, rawGrams: item.rawGrams === null ? null : 0, wastePercent: item.wastePercent }; current.edibleGrams += item.edibleGrams; current.rawGrams = current.rawGrams === null || item.rawGrams === null ? null : current.rawGrams + item.rawGrams; if (current.wastePercent !== item.wastePercent) current.wastePercent = null; shoppingByFood.set(key, current); } }
  const rows = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, day]) => ({ date, base: day.base || null, additions: day.additions || null, total: day.base || day.additions ? day.base + day.additions : null, departments: [...day.departments].map(([name, quantity]) => `${name}: ${quantity}`).join("; ") || null, diets: [...day.diets].map(([name, quantity]) => `${name}: ${quantity}`).join("; ") || null }));
  const shoppingRows = [...shoppingByFood.values()].sort((a, b) => a.date.localeCompare(b.date) || a.food.localeCompare(b.food, locale === "en" ? "en" : "vi")).map((item) => ({ date: item.date, food: item.food, edibleKg: Number((item.edibleGrams / 1000).toFixed(3)), waste: item.wastePercent === null ? null : `${item.wastePercent}%`, purchaseKg: item.rawGrams === null ? null : Number((item.rawGrams / 1000).toFixed(3)) }));
  return { overview: { title: t.dailyOverviewTitle, columns, rows: normalizeReportRows(rows, columns) }, shopping: { title: t.dailyShoppingTitle, columns: shoppingColumns, rows: normalizeReportRows(shoppingRows, shoppingColumns) } };
}

export async function readReport(content: ReportContent, range: ReturnType<typeof parseReportRange>, actor: ReportActor, locale: Locale = DEFAULT_LOCALE): Promise<ReportData> {
  const t = labels(locale);
  const memberships = actor.role === "NURSE" ? await prisma.departmentMembership.findMany({ where: { userId: actor.id }, include: { department: { select: { id: true, name: true } } } }) : [];
  const departmentIds = scopeDepartmentIds(actor.role, memberships.map((item) => item.departmentId));
  const scope = departmentIds ? (memberships.length ? memberships.map((item) => item.department.name).join(", ") : "—") : t.hospitalScope;
  const base = { title: contentLabel(content, locale), from: range.fromValue, to: range.toValue, scope };

  if (content === "full") {
    const contents: ReportContent[] = actor.role === "NURSE" ? ["servings", "additions", "menus", "evidence"] : ["servings", "additions", "menus", "evidence", "warehouse"];
    return readReportBundle(contents, range, actor, locale);
  }
  if (content === "servings") {
    const columns = [{ key: "date", label: t.date }, { key: "meal", label: t.meal }, { key: "department", label: t.department }, { key: "diet", label: t.diet }, { key: "quantity", label: t.baseServings }, { key: "status", label: t.reportStatus }, { key: "submittedAt", label: t.submittedAt }];
    const reports = await prisma.servingReport.findMany({ where: { mealEvent: { mealDate: { gte: range.from, lte: range.to } }, ...(departmentIds ? { departmentId: { in: departmentIds } } : {}) }, include: { department: true, mealEvent: { include: { mealType: true } }, lines: { include: { dietType: true } } }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { department: { name: "asc" } }] });
    const rows = reports.flatMap((report) => report.lines.map((line) => ({ date: dateCell(report.mealEvent.mealDate), meal: report.mealEvent.mealType.name, department: report.department.name, diet: `${line.dietType.code} — ${line.dietType.name}`, quantity: line.quantity, status: report.status, submittedAt: dateTimeCell(report.submittedAt, locale) })));
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (content === "additions") {
    const columns = [{ key: "date", label: t.date }, { key: "meal", label: t.meal }, { key: "department", label: t.department }, { key: "diet", label: t.diet }, { key: "quantity", label: t.contentAdditions }, { key: "kind", label: t.type }, { key: "ack", label: t.kitchenAck }, { key: "reason", label: t.reason }];
    const additions = await prisma.lateMealAddition.findMany({ where: { mealEvent: { mealDate: { gte: range.from, lte: range.to } }, ...(departmentIds ? { departmentId: { in: departmentIds } } : {}) }, include: { department: true, mealEvent: { include: { mealType: true } }, dietType: true }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { submittedAt: "asc" }] });
    const rows = additions.map((item) => ({ date: dateCell(item.mealEvent.mealDate), meal: item.mealEvent.mealType.name, department: item.department.name, diet: `${item.dietType.code} — ${item.dietType.name}`, quantity: item.quantity, kind: item.kind, ack: item.ackStatus, reason: item.reason }));
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (content === "menus") {
    const columns = [{ key: "date", label: t.date }, { key: "meal", label: t.meal }, { key: "diet", label: t.dietCode }, { key: "dishes", label: t.dishes }, { key: "foods", label: t.foods }, { key: "energy", label: t.kcalPerServing }, { key: "target", label: t.target }, { key: "overall", label: t.overall }, { key: "approvedBy", label: t.approvedBy }];
    const meals = await prisma.dietMeal.findMany({ where: { voidedAt: null, status: { not: "CANCELLED" }, mealEvent: { mealDate: { gte: range.from, lte: range.to } } }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { mealEvent: { mealType: { sortOrder: "asc" } } }, { dietType: { sortOrder: "asc" } }], select: { menuSnapshotJson: true, evaluationJson: true, approvedAt: true, approvedBy: { select: { displayName: true } }, dietType: { select: { code: true, name: true } }, mealEvent: { select: { mealDate: true, mealType: { select: { name: true } } } } } });
    const rows = meals.map((meal) => { const items = parseMenuItems(meal.menuSnapshotJson); const evaluation = evaluationSummary(meal.evaluationJson); return { date: dateCell(meal.mealEvent.mealDate), meal: meal.mealEvent.mealType.name, diet: `${meal.dietType.code} — ${meal.dietType.name}`, dishes: [...new Set(items.map((item) => item.dishName))].join(", ") || null, foods: items.map((item) => `${item.itemName} ${item.grams}g`).join("; ") || null, energy: evaluation.energy, target: evaluation.target, overall: evaluation.overall, approvedBy: meal.approvedBy?.displayName ?? null }; });
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (content === "evidence") {
    const columns = [{ key: "date", label: t.date }, { key: "meal", label: t.meal }, { key: "diet", label: t.dietCode }, { key: "kind", label: t.evidenceKind }, { key: "status", label: t.file }, { key: "note", label: t.note }, { key: "uploadedBy", label: t.uploadedBy }, { key: "uploadedAt", label: t.uploadedAt }];
    const evidence = await prisma.mealEvidence.findMany({ where: { OR: [{ dietMeal: { voidedAt: null, mealEvent: { mealDate: { gte: range.from, lte: range.to } } } }, { mealEvent: { mealDate: { gte: range.from, lte: range.to } } }] }, orderBy: { uploadedAt: "asc" }, select: { kind: true, note: true, uploadedAt: true, uploadedBy: { select: { displayName: true } }, mealEvent: { select: { mealDate: true, mealType: { select: { name: true } } } }, dietMeal: { select: { dietType: { select: { code: true, name: true } }, mealEvent: { select: { mealDate: true, mealType: { select: { name: true } } } } } } } });
    const rows = evidence.flatMap((item) => { const event = item.mealEvent ?? item.dietMeal?.mealEvent; if (!event) return []; return [{ date: dateCell(event.mealDate), meal: event.mealType.name, diet: item.dietMeal ? `${item.dietMeal.dietType.code} — ${item.dietMeal.dietType.name}` : t.wholeMeal, kind: item.kind === "MEAL_PHOTO" ? t.mealPhoto : item.kind === "FOOD_SAMPLE" ? t.foodSample : item.kind, status: t.saved, note: item.note, uploadedBy: item.uploadedBy.displayName, uploadedAt: dateTimeCell(item.uploadedAt, locale) }]; });
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (actor.role === "NURSE") return { ...base, columns: [], rows: [] };
  const columns = [{ key: "occurredAt", label: t.occurredAt }, { key: "warehouse", label: t.warehouse }, { key: "type", label: t.type }, { key: "item", label: t.item }, { key: "quantity", label: t.quantity }, { key: "unit", label: t.unit }, { key: "unitPrice", label: t.unitPrice }, { key: "status", label: t.status }];
  const transactions = await prisma.inventoryTransaction.findMany({ where: { occurredAt: { gte: range.from, lte: range.to }, lines: { some: {} } }, include: { warehouse: true, lines: true }, orderBy: { occurredAt: "asc" } });
  const rows = transactions.flatMap((transaction) => transaction.lines.map((line) => ({ occurredAt: dateTimeCell(transaction.occurredAt, locale), warehouse: transaction.warehouse.name, type: transaction.type, item: line.itemName, quantity: Number(line.quantity), unit: line.unit, unitPrice: line.unitPrice == null ? null : Number(line.unitPrice), status: transaction.status })));
  return { ...base, columns, rows: normalizeReportRows(rows, columns) };
}

export async function readReportBundle(contents: ReportContent[], range: ReturnType<typeof parseReportRange>, actor: ReportActor, locale: Locale = DEFAULT_LOCALE): Promise<ReportData> {
  const selected = [...new Set(contents.filter((item) => item !== "full" && !(actor.role === "NURSE" && item === "warehouse")))];
  if (!selected.length) throw new Error(labels(locale).selectAtLeastOne);
  if (selected.length === 1) return readReport(selected[0], range, actor, locale);
  const reports = await Promise.all(selected.map((item) => readReport(item, range, actor, locale)));
  const sections: ReportSection[] = reports.map(({ title, columns, rows }) => ({ title, columns, rows }));
  if (selected.includes("servings") && selected.includes("additions")) { const servings = reports[selected.indexOf("servings")]; const additions = reports[selected.indexOf("additions")]; const summary = await readDailyOverview(range, servings, additions, locale); sections.unshift(summary.overview, summary.shopping); }
  return { title: labels(locale).selectedReportTitle, from: range.fromValue, to: range.toValue, scope: reports[0].scope, columns: [], rows: [], sections };
}

export async function readAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 200) });
}
