import "server-only";

import { prisma } from "./prisma";
import { hospitalDate } from "./serving-report";
import { addDays } from "./meal-events";
import { evidenceStorage } from "./evidence-storage";

export const MANAGEMENT_STATUSES = ["PLANNED", "LOCKED", "PREPARING", "PREPARED", "SERVED"] as const;
export type ManagementStatus = (typeof MANAGEMENT_STATUSES)[number];
export type ManagementMenuItem = { name: string; grams: number | null };
export type ManagementCriterion = { key: string; label: string; status: "OK" | "LOW" | "HIGH" | "MISSING"; actual: number | null; unit: string; target: string };
export type ManagementEvidence = { id: string; kind: "MEAL_PHOTO" | "FOOD_SAMPLE"; note: string | null; uploadedAt: string; uploadedBy: string; publicUrl: string | null };
export type ManagementDiet = { id: string; code: string; name: string; status: ManagementStatus; servings: number | null; menuItems: ManagementMenuItem[]; criteria: ManagementCriterion[]; approvedBy: string | null; reportedBy: string[]; kitchenLead: string | null; evidence: ManagementEvidence[] };
export type ManagementDepartment = { id: string; code: string; name: string; reportId: string | null; submittedAt: string | null; submittedBy: string | null; totalServings: number | null; lines: Array<{ dietCode: string; dietName: string; quantity: number }> };
export type ManagementMeal = { id: string; name: string; cutoffTime: string; serviceTime: string; cutoffAt: string | null; serviceAt: string | null; totalDiets: number; statusCounts: Record<(typeof MANAGEMENT_STATUSES)[number], number>; diets: ManagementDiet[]; departments: ManagementDepartment[]; reportedDepartmentCount: number; totalDepartmentCount: number; reportedServings: number | null };
export type ManagementDay = { date: string; generatedAt: string; isToday: boolean; meals: ManagementMeal[]; departmentCount: number };

export type ManagementSchedulePhase = "SERVED" | "PREPARING" | "SERVING";
export type ManagementScheduleRoute = "NORMAL" | "SONDE";
export type ManagementScheduleNote = { source: "MENU" | "SERVING" | "PATIENT"; department: string | null; text: string };
export type ManagementScheduleDepartment = { id: string; code: string; name: string; quantity: number };
export type ManagementScheduleDiet = {
  id: string;
  code: string;
  name: string;
  feedingRoute: ManagementScheduleRoute;
  servings: number | null;
  status: ManagementStatus;
  departments: ManagementScheduleDepartment[];
  menuItems: string[];
  notes: ManagementScheduleNote[];
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

function schedulePhase(day: Date, serviceTime: string, allServiceTimes: string[], statuses: ManagementStatus[], now: Date): ManagementSchedulePhase {
  const at = serviceAt(day, serviceTime);
  if (statuses.length > 0 && statuses.every((status) => status === "SERVED")) return "SERVED";
  const started = allServiceTimes.map((time) => serviceAt(day, time)).filter((time): time is number => time !== null && time <= now.getTime());
  if (at !== null && started.length > 0 && at === Math.max(...started)) return "SERVING";
  if (at !== null && at < now.getTime()) return "SERVED";
  return "PREPARING";
}

function menuItemNames(value: unknown): string[] {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return [];
  return value.items.flatMap((item) => item && typeof item === "object" && "itemName" in item && typeof item.itemName === "string" && item.itemName.trim() ? [item.itemName.trim()] : []);
}

function managementMenuItems(value: unknown): ManagementMenuItem[] {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return [];
  return value.items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.itemName !== "string" || !row.itemName.trim()) return [];
    return [{ name: row.itemName.trim(), grams: typeof row.grams === "number" && Number.isFinite(row.grams) ? row.grams : null }];
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

export async function readManagementSchedule(now = new Date()): Promise<ManagementSchedule> {
  const start = hospitalDate(now);
  const end = addDays(start, 3);
  const [mealTypes, events, patientNotes, inventory] = await Promise.all([
    prisma.mealType.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, serviceTime: true } }),
    prisma.mealEvent.findMany({
      where: { mealDate: { gte: start, lt: end } },
      orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }],
      select: {
        id: true, mealDate: true, mealTypeId: true, mealType: { select: { serviceTime: true } },
        dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, orderBy: { dietType: { sortOrder: "asc" } }, select: { id: true, dietTypeId: true, feedingRoute: true, status: true, servingsPlanned: true, menuSnapshotJson: true, internalNote: true, patientVisibleNote: true, dietType: { select: { code: true, name: true } } } },
        reports: { where: { status: "SUBMITTED" }, select: { departmentId: true, note: true, department: { select: { id: true, code: true, name: true } }, lines: { select: { dietTypeId: true, quantity: true, internalNote: true, patientVisibleNote: true } } } },
      },
    }),
    prisma.patientNote.findMany({ where: { mealDate: { gte: start, lt: end }, status: "APPROVED" }, orderBy: { createdAt: "asc" }, select: { departmentId: true, mealDate: true, note: true, department: { select: { name: true } } } }),
    prisma.inventoryTransaction.findMany({ where: { type: "IN", status: "ACTIVE", warehouse: { status: "ACTIVE", kind: { in: ["KITCHEN", "SONDE"] } } }, orderBy: { occurredAt: "desc" }, select: { occurredAt: true, note: true, warehouse: { select: { kind: true, name: true } }, _count: { select: { lines: true } } } }),
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
        const departments: ManagementScheduleDepartment[] = [];
        const notes: ManagementScheduleNote[] = [];
        for (const text of [meal.internalNote, meal.patientVisibleNote]) if (text) notes.push({ source: "MENU", department: null, text });
        for (const report of event.reports) {
          const line = report.lines.find((item) => item.dietTypeId === meal.dietTypeId);
          if (!line || line.quantity <= 0) continue;
          departments.push({ ...report.department, quantity: line.quantity });
          for (const text of [report.note, line.internalNote, line.patientVisibleNote]) if (text) notes.push({ source: "SERVING", department: report.department.name, text });
          for (const patientNote of notesByDayDepartment.get(`${key}:${report.departmentId}`) ?? []) notes.push({ source: "PATIENT", department: patientNote.department, text: patientNote.text });
        }
        return { id: meal.id, code: meal.dietType.code, name: meal.dietType.name, feedingRoute: meal.feedingRoute, servings: meal.servingsPlanned > 0 ? meal.servingsPlanned : null, status: meal.status as ManagementStatus, departments, menuItems: menuItemNames(meal.menuSnapshotJson), notes };
      });
      return [mealType.id, { id: event.id, phase: schedulePhase(day, event.mealType.serviceTime, mealTypes.map((item) => item.serviceTime), diets.map((diet) => diet.status), now), serviceTime: event.mealType.serviceTime, diets }];
    }));
    return { date: key, label: dateLabel.format(day), isToday: offset === 0, cells };
  });
  const warehouseFor = (kind: "KITCHEN" | "SONDE"): ManagementWarehouseStatus => {
    const transaction = inventory.find((item) => item.warehouse.kind === kind);
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

export async function readManagementDay(date?: string, now = new Date()): Promise<ManagementDay> {
  const day = parseHospitalDay(date, now);
  const [departments, events] = await Promise.all([
    prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: [{ code: "asc" }, { name: "asc" }], select: { id: true, code: true, name: true } }),
    prisma.mealEvent.findMany({
      where: { mealDate: day }, orderBy: { mealType: { sortOrder: "asc" } },
      select: {
        id: true, mealType: { select: { name: true, cutoffTime: true, serviceTime: true } },
        dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, orderBy: { dietType: { sortOrder: "asc" } }, select: { id: true, status: true, servingsPlanned: true, menuSnapshotJson: true, evaluationJson: true, approvedBy: { select: { displayName: true } }, dietType: { select: { code: true, name: true } }, evidence: { where: { kind: { in: ["MEAL_PHOTO", "FOOD_SAMPLE"] } }, orderBy: { uploadedAt: "desc" }, select: { id: true, kind: true, storagePath: true, note: true, uploadedAt: true, uploadedBy: { select: { displayName: true } } } } } },
        reports: { where: { status: "SUBMITTED" }, select: { id: true, departmentId: true, submittedAt: true, submittedBy: { select: { displayName: true } }, lines: { orderBy: { dietType: { sortOrder: "asc" } }, select: { quantity: true, dietType: { select: { code: true, name: true } } } } } },
      },
    }),
  ]);
  const selectedIsToday = day.getTime() === hospitalDate(now).getTime();
  const dietMealIds = events.flatMap((event) => event.dietMeals.map((meal) => meal.id));
  const servedLogs = dietMealIds.length === 0 ? [] : await prisma.auditLog.findMany({ where: { entityType: "DietMeal", entityId: { in: dietMealIds }, action: "KITCHEN_STATUS_CHANGE", afterJson: { path: ["status"], equals: "SERVED" } }, orderBy: { createdAt: "desc" }, select: { entityId: true, actorName: true } });
  const kitchenLeadByDiet = new Map<string, string>();
  for (const log of servedLogs) if (!kitchenLeadByDiet.has(log.entityId)) kitchenLeadByDiet.set(log.entityId, log.actorName);

  return { date: day.toISOString().slice(0, 10), generatedAt: now.toISOString(), isToday: selectedIsToday, departmentCount: departments.length, meals: events.map((event) => {
    const reportByDepartment = new Map(event.reports.map((report) => [report.departmentId, report]));
    const statusCounts = Object.fromEntries(MANAGEMENT_STATUSES.map((status) => [status, 0])) as ManagementMeal["statusCounts"];
    for (const meal of event.dietMeals) statusCounts[meal.status as ManagementStatus] += 1;
    const departmentRows = departments.map((department) => {
      const report = reportByDepartment.get(department.id);
      return { ...department, reportId: report?.id ?? null, submittedAt: report?.submittedAt?.toISOString() ?? null, submittedBy: report?.submittedBy.displayName ?? null, totalServings: report ? report.lines.reduce((sum, line) => sum + line.quantity, 0) : null, lines: report?.lines.map((line) => ({ dietCode: line.dietType.code, dietName: line.dietType.name, quantity: line.quantity })) ?? [] };
    });
    const submitted = departmentRows.filter((department) => department.reportId !== null);
    const cutoff = serviceAt(day, event.mealType.cutoffTime);
    const service = serviceAt(day, event.mealType.serviceTime);
    return { id: event.id, name: event.mealType.name, cutoffTime: event.mealType.cutoffTime, serviceTime: event.mealType.serviceTime, cutoffAt: cutoff === null ? null : new Date(cutoff).toISOString(), serviceAt: service === null ? null : new Date(service).toISOString(), totalDiets: event.dietMeals.length, statusCounts, diets: event.dietMeals.map((meal) => ({ id: meal.id, code: meal.dietType.code, name: meal.dietType.name, status: meal.status as ManagementStatus, servings: meal.servingsPlanned > 0 ? meal.servingsPlanned : null, menuItems: managementMenuItems(meal.menuSnapshotJson), criteria: managementCriteria(meal.evaluationJson), approvedBy: meal.approvedBy?.displayName ?? null, reportedBy: [...new Set(event.reports.filter((report) => report.lines.some((line) => line.dietType.code === meal.dietType.code && line.quantity > 0)).map((report) => report.submittedBy.displayName))], kitchenLead: kitchenLeadByDiet.get(meal.id) ?? null, evidence: meal.evidence.map((item) => ({ id: item.id, kind: item.kind as ManagementEvidence["kind"], note: item.note, uploadedAt: item.uploadedAt.toISOString(), uploadedBy: item.uploadedBy.displayName, publicUrl: evidenceStorage.publicUrl(item.storagePath) })) })), departments: departmentRows, reportedDepartmentCount: submitted.length, totalDepartmentCount: departments.length, reportedServings: submitted.length > 0 ? submitted.reduce((sum, department) => sum + (department.totalServings ?? 0), 0) : null };
  }) };
}
