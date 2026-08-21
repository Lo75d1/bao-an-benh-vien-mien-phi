import type { Role } from "@prisma/client";
import { buildDietMealShopping } from "./kitchen";
import { hospitalDate } from "./serving-report";
import { prisma } from "./prisma";
import { entryWindowEnd, readOperationalSettings } from "./settings";

const DAY_MS = 86_400_000;

export type OverviewNumber = number | null;

export type AdminOverview = {
  kind: "ADMIN";
  mealCount: OverviewNumber;
  departmentCount: OverviewNumber;
  missingMenuCount: OverviewNumber;
  pendingAdditionCount: OverviewNumber;
  warehouseVarianceCount: OverviewNumber;
};

export type NurseOverview = {
  kind: "NURSE";
  departmentName: string | null;
  reportedMealCount: OverviewNumber;
  mealCount: OverviewNumber;
  pendingNoteCount: OverviewNumber;
};

export type DietitianOverview = {
  kind: "DIETITIAN";
  missingDateDietCount: OverviewNumber;
};

export type KitchenOverview = {
  kind: "KITCHEN";
  nextMealName: string | null;
  nextMealDate: Date | null;
  serviceTime: string | null;
  servingCount: OverviewNumber;
  pendingAdditionCount: OverviewNumber;
};

export type RoleOverview = AdminOverview | NurseOverview | DietitianOverview | KitchenOverview;

export function knownCount(count: number, hasSourceData: boolean): OverviewNumber {
  return hasSourceData ? count : null;
}

export function countMissingDateDiet(pairs: Array<{ mealDate: Date; dietTypeId: string }>): number {
  return new Set(pairs.map((item) => `${item.mealDate.toISOString().slice(0, 10)}:${item.dietTypeId}`)).size;
}

export function countWarehouseVariances(
  expected: Array<{ foodId: string; rawGrams: number | null }>,
  actual: Array<{ foodId: string | null; quantity: number; unit: string }>,
): number | null {
  const expectedByFood = new Map(expected.filter((item) => item.rawGrams !== null).map((item) => [item.foodId, item.rawGrams as number]));
  const comparable = actual.flatMap((item) => {
    const expectedQuantity = item.foodId ? expectedByFood.get(item.foodId) : undefined;
    return item.unit.trim().toLowerCase() === "g" && expectedQuantity !== undefined
      ? [{ expected: expectedQuantity, actual: item.quantity }]
      : [];
  });
  if (comparable.length === 0) return null;
  return comparable.filter((item) => Math.abs(item.actual - item.expected) > 0.001).length;
}

function tomorrow(day: Date) {
  return new Date(day.getTime() + DAY_MS);
}

async function readAdminOverview(now: Date): Promise<AdminOverview> {
  const day = hospitalDate(now);
  const end = tomorrow(day);
  const [events, activeDepartmentCount, pendingAdditionCount, outTransactions] = await Promise.all([
    prisma.mealEvent.findMany({
      where: { mealDate: day },
      select: {
        id: true,
        dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, select: { approvedAt: true } },
        reports: { where: { status: "SUBMITTED" }, select: { departmentId: true } },
      },
    }),
    prisma.department.count({ where: { status: "ACTIVE" } }),
    prisma.lateMealAddition.count({ where: { mealEvent: { mealDate: day }, ackStatus: "PENDING" } }),
    prisma.inventoryTransaction.findMany({
      where: { type: "OUT", status: "ACTIVE", occurredAt: { gte: day, lt: end }, relatedDietMealId: { not: null } },
      select: {
        lines: { select: { foodId: true, quantity: true, unit: true } },
        relatedDietMeal: { select: { id: true, dietTypeId: true, servingsPlanned: true, menuSnapshotJson: true, dietType: { select: { name: true } } } },
      },
    }),
  ]);
  const reportedDepartments = new Set(events.flatMap((event) => event.reports.map((report) => report.departmentId))).size;
  const varianceCounts = outTransactions.map((transaction) => {
    const meal = transaction.relatedDietMeal;
    if (!meal) return null;
    const expected = buildDietMealShopping([{ id: meal.id, dietTypeId: meal.dietTypeId, dietName: meal.dietType.name, servingsPlanned: meal.servingsPlanned, menuSnapshotJson: meal.menuSnapshotJson }]);
    return countWarehouseVariances(expected.items, transaction.lines.map((line) => ({ ...line, quantity: Number(line.quantity) })));
  });
  const comparableVarianceCounts = varianceCounts.filter((count): count is number => count !== null);
  return {
    kind: "ADMIN",
    mealCount: knownCount(events.length, events.length > 0),
    departmentCount: knownCount(reportedDepartments, events.length > 0 && activeDepartmentCount > 0),
    missingMenuCount: knownCount(events.flatMap((event) => event.dietMeals).filter((meal) => !meal.approvedAt).length, events.length > 0),
    pendingAdditionCount: knownCount(pendingAdditionCount, events.length > 0),
    warehouseVarianceCount: comparableVarianceCounts.length > 0 ? comparableVarianceCounts.reduce((sum, count) => sum + count, 0) : null,
  };
}

async function readNurseOverview(userId: string, now: Date): Promise<NurseOverview> {
  const day = hospitalDate(now);
  const memberships = await prisma.departmentMembership.findMany({ where: { userId, department: { status: "ACTIVE" } }, select: { departmentId: true, department: { select: { name: true } } } });
  if (memberships.length !== 1) return { kind: "NURSE", departmentName: null, reportedMealCount: null, mealCount: null, pendingNoteCount: null };
  const membership = memberships[0];
  const [events, pendingNoteCount] = await Promise.all([
    prisma.mealEvent.findMany({ where: { mealDate: day }, select: { id: true, reports: { where: { departmentId: membership.departmentId, status: "SUBMITTED" }, select: { id: true } } } }),
    prisma.patientNote.count({ where: { departmentId: membership.departmentId, status: "RECEIVED" } }),
  ]);
  return {
    kind: "NURSE",
    departmentName: membership.department.name,
    reportedMealCount: knownCount(events.filter((event) => event.reports.length > 0).length, events.length > 0),
    mealCount: knownCount(events.length, events.length > 0),
    pendingNoteCount,
  };
}

async function readDietitianOverview(now: Date): Promise<DietitianOverview> {
  const day = hospitalDate(now);
  const settings = await readOperationalSettings();
  const horizon = entryWindowEnd(day, settings.advanceEntryDays);
  const meals = await prisma.dietMeal.findMany({
    where: { voidedAt: null, status: { not: "CANCELLED" }, mealEvent: { mealDate: { gte: day, lte: horizon } }, ...(settings.sondeEnabled ? {} : { feedingRoute: "NORMAL" }) },
    select: { dietTypeId: true, approvedAt: true, mealEvent: { select: { mealDate: true } } },
  });
  const missing = meals.filter((meal) => !meal.approvedAt);
  return { kind: "DIETITIAN", missingDateDietCount: knownCount(countMissingDateDiet(missing.map((item) => ({ mealDate: item.mealEvent.mealDate, dietTypeId: item.dietTypeId }))), meals.length > 0) };
}

async function readKitchenOverview(now: Date): Promise<KitchenOverview> {
  const day = hospitalDate(now);
  const event = await prisma.mealEvent.findFirst({
    where: { mealDate: { gte: day }, OR: [{ dietMeals: { some: { voidedAt: null, status: { notIn: ["SERVED", "CANCELLED"] } } } }, { additions: { some: { ackStatus: "PENDING" } } }] },
    orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }],
    select: { mealDate: true, mealType: { select: { name: true, serviceTime: true } }, dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, select: { servingsPlanned: true } }, additions: { select: { quantity: true, ackStatus: true } } },
  });
  if (!event) return { kind: "KITCHEN", nextMealName: null, nextMealDate: null, serviceTime: null, servingCount: null, pendingAdditionCount: null };
  const planned = event.dietMeals.reduce((sum, meal) => sum + meal.servingsPlanned, 0);
  const additions = event.additions.reduce((sum, addition) => sum + addition.quantity, 0);
  return { kind: "KITCHEN", nextMealName: event.mealType.name, nextMealDate: event.mealDate, serviceTime: event.mealType.serviceTime, servingCount: knownCount(planned + additions, planned > 0), pendingAdditionCount: event.additions.filter((addition) => addition.ackStatus === "PENDING").length };
}

export async function readRoleOverview(role: Role, userId: string, now = new Date()): Promise<RoleOverview> {
  if (role === "ADMIN") return readAdminOverview(now);
  if (role === "NURSE") return readNurseOverview(userId, now);
  if (role === "DIETITIAN") return readDietitianOverview(now);
  return readKitchenOverview(now);
}
