import "server-only";

import type { FeedingRoute } from "@prisma/client";
import { prisma } from "./prisma";
import { hospitalDate } from "./serving-report";
import { addDays, mealTimePhase } from "./meal-events";
import { evidenceStorage } from "./evidence-storage";
import { readOperationalSettings } from "./settings";
import { getMealBusinessFacts, getMealPhase, type MealBusinessFacts, type MealPhase } from "./meal-state";

export const MANAGEMENT_STATUSES = ["PLANNED", "LOCKED", "PREPARING", "PREPARED", "SERVED"] as const;
export type ManagementStatus = (typeof MANAGEMENT_STATUSES)[number];
export type ManagementMenuItem = { name: string; dishName: string; grams: number | null };
export type ManagementCriterion = { key: string; label: string; status: "OK" | "LOW" | "HIGH" | "MISSING"; actual: number | null; unit: string; target: string };
export type ManagementEvidence = { id: string; kind: "MEAL_PHOTO" | "FOOD_SAMPLE"; note: string | null; uploadedAt: string; uploadedBy: string; publicUrl: string | null };
export type ManagementDiet = { id: string; code: string; name: string; status: ManagementStatus; servings: number | null; approved: boolean; menuItems: ManagementMenuItem[]; criteria: ManagementCriterion[]; approvedBy: string | null; reportedBy: string[]; kitchenLead: string | null; kitchenTimes: Partial<Record<ManagementStatus, string>>; kitchenTimeSources: Partial<Record<ManagementStatus, "KITCHEN" | "ADMIN">>; evidence: ManagementEvidence[] };
export type ManagementDepartment = { id: string; code: string; name: string; reportId: string | null; submittedAt: string | null; submittedBy: string | null; totalServings: number | null; deliveryReceipt: { status: "FULL" | "SHORT"; expectedQuantity: number; receivedQuantity: number; note: string | null; confirmedAt: string; confirmedBy: string } | null; lines: Array<{ dietCode: string; dietName: string; quantity: number }> };
export type ManagementAddition = { id: string; departmentId: string; departmentName: string; dietCode: string; dietName: string; quantity: number; reason: string; ackStatus: "PENDING" | "RECEIVED" | "INSUFFICIENT" | "SUBSTITUTE"; submittedAt: string; submittedBy: string };
export type ManagementMeal = { id: string; name: string; cutoffTime: string; serviceTime: string; cutoffAt: string | null; serviceAt: string | null; totalDiets: number; unapprovedDiets: number; plannedServings: number | null; inventoryEntryCount: number; statusCounts: Record<(typeof MANAGEMENT_STATUSES)[number], number>; diets: ManagementDiet[]; eventEvidence: ManagementEvidence[]; foodRetention24hRequired: boolean; departments: ManagementDepartment[]; additions: ManagementAddition[]; reportedDepartmentCount: number; totalDepartmentCount: number; deliveryReceiptCount: number; reportedServings: number | null; businessFacts: MealBusinessFacts };
export type ManagementDay = { date: string; generatedAt: string; isToday: boolean; serviceCompletionMinutes: number; meals: ManagementMeal[]; departmentCount: number };

export type ManagementSchedulePhase = MealPhase;
export type ManagementScheduleRoute = "NORMAL" | "SONDE";
export type ManagementScheduleNote = { source: "MENU" | "SERVING" | "PATIENT"; department: string | null; text: string };
export type ManagementLateAddition = { id: string; quantity: number; reason: string; department: string };
export type ManagementInventoryEntry = { id: string; warehouse: string; type: string; occurredAt: string; note: string | null };
export type ManagementScheduleDiet = {
  id: string;
  code: string;
  name: string;
  feedingRoute: ManagementScheduleRoute;
  servings: number | null;
  status: ManagementStatus;
  menuItems: ManagementMenuItem[];
  criteria: ManagementCriterion[];
  evidence: { mealPhoto: boolean; foodSample: boolean };
  notes: ManagementScheduleNote[];
  lateAdditions: ManagementLateAddition[];
  inventory: ManagementInventoryEntry[];
};
export type ManagementScheduleCell = { id: string; phase: ManagementSchedulePhase; serviceTime: string; diets: ManagementScheduleDiet[] };
export type ManagementScheduleDay = { date: string; label: string; isToday: boolean; cells: Record<string, ManagementScheduleCell | null> };
export type ManagementWarehouseStatus = { name: string; occurredAt: string; lineCount: number; note: string | null } | null;
export type ManagementSchedule = {
  generatedAt: string;
  mealTypes: Array<{ id: string; name: string; serviceTime: string }>;
  days: ManagementScheduleDay[];
  routes: Record<ManagementScheduleRoute, { warehouse: ManagementWarehouseStatus }>;
};

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });

function schedulePhase(day: Date, cutoffTime: string, serviceTime: string, now: Date): ManagementSchedulePhase {
  return getMealPhase(day, cutoffTime, serviceTime, now) ?? "CLOSED";
}

function managementMenuItems(value: unknown): ManagementMenuItem[] {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return [];
  return value.items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.itemName !== "string" || !row.itemName.trim()) return [];
    return [{ name: row.itemName.trim(), dishName: typeof row.dishName === "string" && row.dishName.trim() ? row.dishName.trim() : "Món 1", grams: typeof row.grams === "number" && Number.isFinite(row.grams) ? row.grams : null }];
  });
}

function managementCriteria(value: unknown): ManagementCriterion[] {
  if (!value || typeof value !== "object" || !("criteria" in value) || !Array.isArray(value.criteria)) return [];
  return value.criteria.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.key !== "string" || typeof row.label !== "string" || !["OK", "LOW", "HIGH", "MISSING"].includes(String(row.status))) return [];
    return [{ key: row.key, label: row.label, status: row.status as ManagementCriterion["status"], actual: typeof row.actual === "number" && Number.isFinite(row.actual) ? row.actual : null, unit: typeof row.unit === "string" ? row.unit : "", target: typeof row.target === "string" && row.target ? row.target : "—" }];
  });
}

export async function readManagementSchedule(centerDate?: string, now = new Date()): Promise<ManagementSchedule> {
  const center = parseHospitalDay(centerDate, now);
  const start = addDays(center, -1);
  const end = addDays(start, 3);
  const [mealTypes, events, patientNotes, inventory] = await Promise.all([
    prisma.mealType.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, cutoffTime: true, serviceTime: true } }),
    prisma.mealEvent.findMany({
      where: { mealDate: { gte: start, lt: end } },
      orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }],
      select: {
        id: true, mealDate: true, mealTypeId: true, mealType: { select: { cutoffTime: true, serviceTime: true } },
        evidence: { where: { kind: "FOOD_SAMPLE" }, select: { kind: true } },
        dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, orderBy: { dietType: { sortOrder: "asc" } }, select: { id: true, dietTypeId: true, feedingRoute: true, status: true, servingsPlanned: true, menuSnapshotJson: true, evaluationJson: true, patientVisibleNote: true, dietType: { select: { code: true, name: true } }, evidence: { where: { kind: { in: ["MEAL_PHOTO", "FOOD_SAMPLE"] } }, select: { kind: true } } } },
        reports: { where: { status: "SUBMITTED" }, select: { departmentId: true, note: true, department: { select: { id: true, code: true, name: true } }, lines: { select: { dietTypeId: true, quantity: true, patientVisibleNote: true } } } },
        additions: { select: { id: true, dietTypeId: true, quantity: true, reason: true, department: { select: { name: true } } } },
      },
    }),
    prisma.patientNote.findMany({ where: { mealDate: { gte: start, lt: end }, status: "APPROVED" }, orderBy: { createdAt: "asc" }, select: { departmentId: true, mealDate: true, note: true, department: { select: { name: true } } } }),
    prisma.inventoryTransaction.findMany({ where: { status: "ACTIVE", warehouse: { status: "ACTIVE", kind: { in: ["KITCHEN", "SONDE"] } } }, orderBy: { occurredAt: "desc" }, select: { id: true, type: true, occurredAt: true, note: true, relatedDietMealId: true, warehouse: { select: { kind: true, name: true } }, _count: { select: { lines: true } } } }),
  ]);
  const notesByDayDepartment = new Map<string, Array<{ text: string; department: string }>>();
  for (const note of patientNotes) {
    const key = `${note.mealDate.toISOString().slice(0, 10)}:${note.departmentId}`;
    const list = notesByDayDepartment.get(key) ?? [];
    list.push({ text: note.note, department: note.department.name });
    notesByDayDepartment.set(key, list);
  }
  const eventByKey = new Map(events.map((event) => [`${event.mealDate.toISOString().slice(0, 10)}:${event.mealTypeId}`, event]));
  const days = Array.from({ length: 3 }, (_, offset): ManagementScheduleDay => {
    const day = addDays(start, offset);
    const key = day.toISOString().slice(0, 10);
    const cells = Object.fromEntries(mealTypes.map((mealType) => {
      const event = eventByKey.get(`${key}:${mealType.id}`);
      if (!event) return [mealType.id, null];
      const diets = event.dietMeals.map((meal): ManagementScheduleDiet => {
        const notes: ManagementScheduleNote[] = [];
        if (meal.patientVisibleNote) notes.push({ source: "MENU", department: null, text: meal.patientVisibleNote });
        for (const report of event.reports) {
          const line = report.lines.find((item) => item.dietTypeId === meal.dietTypeId);
          if (!line || line.quantity <= 0) continue;
          for (const text of [report.note, line.patientVisibleNote]) if (text) notes.push({ source: "SERVING", department: report.department.name, text });
          for (const patientNote of notesByDayDepartment.get(`${key}:${report.departmentId}`) ?? []) notes.push({ source: "PATIENT", department: patientNote.department, text: patientNote.text });
        }
        const routeKind = meal.feedingRoute === "NORMAL" ? "KITCHEN" : "SONDE";
        const routeInventory = inventory.filter((item) => item.warehouse.kind === routeKind);
        const directlyRelated = routeInventory.filter((item) => item.relatedDietMealId === meal.id);
        const relatedInventory = (directlyRelated.length > 0 ? directlyRelated : routeInventory.slice(0, 5)).map((item) => ({ id: item.id, warehouse: item.warehouse.name, type: item.type, occurredAt: item.occurredAt.toISOString(), note: item.note }));
        return { id: meal.id, code: meal.dietType.code, name: meal.dietType.name, feedingRoute: meal.feedingRoute, servings: meal.servingsPlanned > 0 ? meal.servingsPlanned : null, status: meal.status as ManagementStatus, menuItems: managementMenuItems(meal.menuSnapshotJson), criteria: managementCriteria(meal.evaluationJson), evidence: { mealPhoto: meal.evidence.some((item) => item.kind === "MEAL_PHOTO"), foodSample: event.evidence.some((item) => item.kind === "FOOD_SAMPLE") }, notes, lateAdditions: event.additions.filter((item) => item.dietTypeId === meal.dietTypeId).map((item) => ({ id: item.id, quantity: item.quantity, reason: item.reason, department: item.department.name })), inventory: relatedInventory };
      });
      return [mealType.id, { id: event.id, phase: schedulePhase(day, event.mealType.cutoffTime, event.mealType.serviceTime, now), serviceTime: event.mealType.serviceTime, diets }];
    }));
    return { date: key, label: dateLabel.format(day), isToday: day.getTime() === hospitalDate(now).getTime(), cells };
  });
  const warehouseFor = (kind: "KITCHEN" | "SONDE"): ManagementWarehouseStatus => {
    const transaction = inventory.find((item) => item.warehouse.kind === kind && item.type === "IN");
    return transaction ? { name: transaction.warehouse.name, occurredAt: transaction.occurredAt.toISOString(), lineCount: transaction._count.lines, note: transaction.note } : null;
  };
  return { generatedAt: now.toISOString(), mealTypes, days, routes: { NORMAL: { warehouse: warehouseFor("KITCHEN") }, SONDE: { warehouse: warehouseFor("SONDE") } } };
}

function parseHospitalDay(value: string | undefined, now: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return hospitalDate(now);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? hospitalDate(now) : parsed;
}

function serviceAt(day: Date, time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour - 7, minute);
}

export async function readManagementDay(date?: string, now = new Date(), departmentIds?: string[], feedingRoute?: FeedingRoute, configuredCompletionMinutes?: number): Promise<ManagementDay> {
  const day = parseHospitalDay(date, now);
  const [settings, departments, events] = await Promise.all([
    readOperationalSettings(),
    prisma.department.findMany({ where: { status: "ACTIVE", ...(departmentIds ? { id: { in: departmentIds } } : {}) }, orderBy: [{ code: "asc" }, { name: "asc" }], select: { id: true, code: true, name: true } }),
    prisma.mealEvent.findMany({
      where: { mealDate: day, ...(feedingRoute ? { mealType: { feedingRoute } } : {}) }, orderBy: { mealType: { sortOrder: "asc" } },
      select: {
        id: true, mealType: { select: { name: true, cutoffTime: true, serviceTime: true } },
        evidence: { where: { kind: "FOOD_SAMPLE" }, orderBy: { uploadedAt: "desc" }, select: { id: true, kind: true, storagePath: true, note: true, uploadedAt: true, uploadedBy: { select: { displayName: true } } } },
        dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" }, ...(feedingRoute ? { feedingRoute } : {}) }, orderBy: { dietType: { sortOrder: "asc" } }, select: { id: true, status: true, servingsPlanned: true, approvedAt: true, menuSnapshotJson: true, evaluationJson: true, approvedBy: { select: { displayName: true } }, dietType: { select: { code: true, name: true } }, evidence: { where: { kind: { in: ["MEAL_PHOTO", "FOOD_SAMPLE"] } }, orderBy: { uploadedAt: "desc" }, select: { id: true, kind: true, storagePath: true, note: true, uploadedAt: true, uploadedBy: { select: { displayName: true } } } } } },
        reports: { where: { status: "SUBMITTED", ...(departmentIds ? { departmentId: { in: departmentIds } } : {}) }, select: { id: true, departmentId: true, submittedAt: true, submittedBy: { select: { displayName: true } }, lines: { orderBy: { dietType: { sortOrder: "asc" } }, select: { quantity: true, dietType: { select: { code: true, name: true } } } } } },
        deliveryReceipts: { where: departmentIds ? { departmentId: { in: departmentIds } } : undefined, select: { departmentId: true, status: true, expectedQuantity: true, receivedQuantity: true, note: true, confirmedAt: true, confirmedBy: { select: { displayName: true } } } },
        additions: { where: departmentIds ? { departmentId: { in: departmentIds } } : undefined, orderBy: { submittedAt: "desc" }, select: { id: true, departmentId: true, quantity: true, reason: true, ackStatus: true, submittedAt: true, submittedBy: { select: { displayName: true } }, department: { select: { name: true } }, dietType: { select: { code: true, name: true } } } },
      },
    }),
  ]);
  const selectedIsToday = day.getTime() === hospitalDate(now).getTime();
  const dietMealIds = events.flatMap((event) => event.dietMeals.map((meal) => meal.id));
  const [servedLogs, inventoryCounts] = dietMealIds.length === 0 ? [[], []] : await Promise.all([
    prisma.auditLog.findMany({ where: { entityType: "DietMeal", entityId: { in: dietMealIds }, action: { in: ["KITCHEN_STATUS_CHANGE", "ADMIN_KITCHEN_MILESTONE_ADD"] } }, orderBy: { createdAt: "asc" }, select: { entityId: true, action: true, actorName: true, createdAt: true, afterJson: true } }),
    prisma.inventoryTransaction.groupBy({ by: ["relatedDietMealId"], where: { relatedDietMealId: { in: dietMealIds }, type: "IN", status: "ACTIVE" }, _count: { _all: true } }),
  ]);
  const inventoryCountByDiet = new Map(inventoryCounts.flatMap((item) => item.relatedDietMealId ? [[item.relatedDietMealId, item._count._all] as const] : []));
  const kitchenLeadByDiet = new Map<string, string>();
  const kitchenTimesByDiet = new Map<string, Partial<Record<ManagementStatus, string>>>();
  const kitchenTimeSourcesByDiet = new Map<string, Partial<Record<ManagementStatus, "KITCHEN" | "ADMIN">>>();
  for (const log of servedLogs) {
    const after = log.afterJson && typeof log.afterJson === "object" && !Array.isArray(log.afterJson) ? log.afterJson as Record<string, unknown> : null;
    const value = after?.status;
    if (!MANAGEMENT_STATUSES.includes(value as ManagementStatus)) continue;
    const times = kitchenTimesByDiet.get(log.entityId) ?? {};
    const sources = kitchenTimeSourcesByDiet.get(log.entityId) ?? {};
    if (times[value as ManagementStatus]) continue;
    const manualAt = log.action === "ADMIN_KITCHEN_MILESTONE_ADD" && typeof after?.occurredAt === "string" ? new Date(after.occurredAt) : null;
    times[value as ManagementStatus] = manualAt && !Number.isNaN(manualAt.getTime()) ? manualAt.toISOString() : log.createdAt.toISOString();
    sources[value as ManagementStatus] = log.action === "ADMIN_KITCHEN_MILESTONE_ADD" ? "ADMIN" : "KITCHEN";
    kitchenTimesByDiet.set(log.entityId, times);
    kitchenTimeSourcesByDiet.set(log.entityId, sources);
    if (value === "SERVED" && log.action === "KITCHEN_STATUS_CHANGE") kitchenLeadByDiet.set(log.entityId, log.actorName);
  }

  return { date: day.toISOString().slice(0, 10), generatedAt: now.toISOString(), isToday: selectedIsToday, serviceCompletionMinutes: configuredCompletionMinutes ?? settings.serviceCompletionMinutes, departmentCount: departments.length, meals: events.map((event) => {
    const visibleDietCodes = new Set(event.dietMeals.map((meal) => meal.dietType.code));
    const reportByDepartment = new Map(event.reports.map((report) => [report.departmentId, report]));
    const receiptByDepartment = new Map(event.deliveryReceipts.map((receipt) => [receipt.departmentId, receipt]));
    const statusCounts = Object.fromEntries(MANAGEMENT_STATUSES.map((status) => [status, 0])) as ManagementMeal["statusCounts"];
    for (const meal of event.dietMeals) statusCounts[meal.status as ManagementStatus] += 1;
    const departmentRows = departments.map((department) => {
      const report = reportByDepartment.get(department.id);
      const lines = report?.lines.filter((line) => visibleDietCodes.has(line.dietType.code)) ?? [];
      const receipt = receiptByDepartment.get(department.id);
      return { ...department, reportId: report?.id ?? null, submittedAt: report?.submittedAt?.toISOString() ?? null, submittedBy: report?.submittedBy.displayName ?? null, totalServings: report ? lines.reduce((sum, line) => sum + line.quantity, 0) : null, deliveryReceipt: receipt ? { status: receipt.status, expectedQuantity: receipt.expectedQuantity, receivedQuantity: receipt.receivedQuantity, note: receipt.note, confirmedAt: receipt.confirmedAt.toISOString(), confirmedBy: receipt.confirmedBy.displayName } : null, lines: lines.map((line) => ({ dietCode: line.dietType.code, dietName: line.dietType.name, quantity: line.quantity })) };
    });
    const submitted = departmentRows.filter((department) => department.reportId !== null);
    const cutoff = serviceAt(day, event.mealType.cutoffTime);
    const service = serviceAt(day, event.mealType.serviceTime);
    const plannedTotal = event.dietMeals.reduce((sum, meal) => sum + meal.servingsPlanned, 0);
    return { id: event.id, name: event.mealType.name, cutoffTime: event.mealType.cutoffTime, serviceTime: event.mealType.serviceTime, cutoffAt: cutoff === null ? null : new Date(cutoff).toISOString(), serviceAt: service === null ? null : new Date(service).toISOString(), totalDiets: event.dietMeals.length, unapprovedDiets: event.dietMeals.filter((meal) => managementMenuItems(meal.menuSnapshotJson).length === 0).length, plannedServings: event.dietMeals.length ? plannedTotal : null, inventoryEntryCount: event.dietMeals.reduce((sum, meal) => sum + (inventoryCountByDiet.get(meal.id) ?? 0), 0), statusCounts, diets: event.dietMeals.map((meal) => ({ id: meal.id, code: meal.dietType.code, name: meal.dietType.name, status: meal.status as ManagementStatus, servings: meal.servingsPlanned > 0 ? meal.servingsPlanned : null, approved: mealTimePhase(day, event.mealType.cutoffTime, event.mealType.serviceTime, now) !== "BEFORE_CUTOFF", menuItems: managementMenuItems(meal.menuSnapshotJson), criteria: managementCriteria(meal.evaluationJson), approvedBy: meal.approvedBy?.displayName ?? null, reportedBy: [...new Set(event.reports.filter((report) => report.lines.some((line) => line.dietType.code === meal.dietType.code && line.quantity > 0)).map((report) => report.submittedBy.displayName))], kitchenLead: kitchenLeadByDiet.get(meal.id) ?? null, kitchenTimes: kitchenTimesByDiet.get(meal.id) ?? {}, kitchenTimeSources: kitchenTimeSourcesByDiet.get(meal.id) ?? {}, evidence: meal.evidence.map((item) => ({ id: item.id, kind: item.kind as ManagementEvidence["kind"], note: item.note, uploadedAt: item.uploadedAt.toISOString(), uploadedBy: item.uploadedBy.displayName, publicUrl: evidenceStorage.publicUrl(item.storagePath) })) })), eventEvidence: event.evidence.map((item) => ({ id: item.id, kind: item.kind as ManagementEvidence["kind"], note: item.note, uploadedAt: item.uploadedAt.toISOString(), uploadedBy: item.uploadedBy.displayName, publicUrl: evidenceStorage.publicUrl(item.storagePath) })), foodRetention24hRequired: settings.foodRetention24hRequired, departments: departmentRows, additions: event.additions.map((item) => ({ id: item.id, departmentId: item.departmentId, departmentName: item.department.name, dietCode: item.dietType.code, dietName: item.dietType.name, quantity: item.quantity, reason: item.reason, ackStatus: item.ackStatus, submittedAt: item.submittedAt.toISOString(), submittedBy: item.submittedBy.displayName })), reportedDepartmentCount: submitted.length, totalDepartmentCount: departments.length, deliveryReceiptCount: event.deliveryReceipts.length, reportedServings: submitted.length > 0 ? submitted.reduce((sum, department) => sum + (department.totalServings ?? 0), 0) : null, businessFacts: getMealBusinessFacts({ dietStatuses: event.dietMeals.map((meal) => meal.status), reportedDepartmentCount: submitted.length, totalDepartmentCount: departments.length, deliveryReceipts: event.deliveryReceipts.map((receipt) => ({ status: receipt.status })), mealPhotoCount: event.dietMeals.reduce((sum, meal) => sum + meal.evidence.filter((item) => item.kind === "MEAL_PHOTO").length, 0), retention24hRequired: settings.foodRetention24hRequired, retention24hCount: event.evidence.filter((item) => item.kind === "FOOD_SAMPLE").length }) };
  }) };
}
