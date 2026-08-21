import type { DietMealStatus, FeedingRoute, Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";

export const DAY_MS = 86_400_000;
export const VISIBLE_WEEK_OFFSETS = [0, 1] as const;

export type CalendarScope = {
  reportWhere?: Prisma.ServingReportWhereInput;
  departmentIds: string[];
};

export type CalendarEvent = Prisma.MealEventGetPayload<{
  include: {
    mealType: true;
    dietMeals: { include: { dietType: true } };
    reports: { include: { lines: true } };
  };
}>;

const STATUS_ORDER: DietMealStatus[] = ["PLANNED", "LOCKED", "PREPARING", "PREPARED", "SERVED"];

export function rollupMealEventStatus(statuses: DietMealStatus[]): DietMealStatus | null {
  if (statuses.length === 0) return null;
  const active = statuses.filter((status) => status !== "CANCELLED");
  if (active.length === 0) return "CANCELLED";
  return active.reduce((earliest, status) =>
    STATUS_ORDER.indexOf(status) < STATUS_ORDER.indexOf(earliest) ? status : earliest,
  );
}

export function buildCalendarScope(role: Role, departmentIds: string[]): CalendarScope {
  if (role !== "NURSE") return { departmentIds: [] };
  return {
    departmentIds,
    reportWhere: { departmentId: { in: departmentIds } },
  };
}

export function startOfIsoWeek(date: Date): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy;
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * DAY_MS);
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseWeek(value: string | undefined, now = new Date()): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(parsed.valueOf())) return startOfIsoWeek(parsed);
  }
  return startOfIsoWeek(now);
}

export function restrictWeekForRole(role: Role, requested: Date, now = new Date()): Date {
  if (role === "ADMIN") return requested;
  const current = startOfIsoWeek(now);
  const next = addDays(current, 7);
  const key = toDateKey(requested);
  return key === toDateKey(next) ? next : current;
}

export async function ensureEmptyMealEvents(
  weekStart: Date,
  actor: { id: string; displayName: string },
) {
  const [mealTypes, dietTypes] = await Promise.all([
    prisma.mealType.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } }),
    prisma.dietType.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (mealTypes.length === 0 || dietTypes.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (let day = 0; day < 7; day += 1) {
      const mealDate = addDays(weekStart, day);
      for (const mealType of mealTypes) {
        let mealEvent = await tx.mealEvent.findUnique({
          where: { mealDate_mealTypeId: { mealDate, mealTypeId: mealType.id } },
        });
        if (!mealEvent) {
          mealEvent = await tx.mealEvent.create({ data: { mealDate, mealTypeId: mealType.id } });
          await tx.auditLog.create({
            data: {
              entityType: "MealEvent",
              entityId: mealEvent.id,
              action: "CREATE_EMPTY",
              actorId: actor.id,
              actorName: actor.displayName,
              afterJson: { mealDate: toDateKey(mealDate), mealTypeId: mealType.id },
              reason: "Khởi tạo ô lịch tuần M1",
            },
          });
        }
        for (const dietType of dietTypes) {
          const existing = await tx.dietMeal.findUnique({
            where: { mealEventId_dietTypeId: { mealEventId: mealEvent.id, dietTypeId: dietType.id } },
            select: { id: true },
          });
          if (existing) continue;
          const dietMeal = await tx.dietMeal.create({
            data: {
              mealEventId: mealEvent.id,
              dietTypeId: dietType.id,
              feedingRoute: dietType.feedingRoute,
            },
          });
          await tx.auditLog.create({
            data: {
              entityType: "DietMeal",
              entityId: dietMeal.id,
              action: "CREATE_EMPTY",
              actorId: actor.id,
              actorName: actor.displayName,
              afterJson: { mealEventId: mealEvent.id, dietTypeId: dietType.id, feedingRoute: dietType.feedingRoute },
              reason: "Khởi tạo chế độ ăn rỗng cho lịch tuần M1",
            },
          });
        }
      }
    }
  });
}

export async function readCalendarWeek(
  weekStart: Date,
  role: Role,
  departmentIds: string[],
  feedingRoute?: FeedingRoute,
) {
  const scope = buildCalendarScope(role, departmentIds);
  return prisma.mealEvent.findMany({
    where: { mealDate: { gte: weekStart, lt: addDays(weekStart, 7) } },
    orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }],
    include: {
      mealType: true,
      dietMeals: {
        where: feedingRoute ? { feedingRoute } : undefined,
        orderBy: { dietType: { sortOrder: "asc" } },
        include: { dietType: true },
      },
      reports: {
        where: scope.reportWhere,
        include: { lines: true },
      },
    },
  });
}

export function displayedServings(event: CalendarEvent, dietMealId: string, role: Role): number | null {
  const meal = event.dietMeals.find((item) => item.id === dietMealId);
  if (!meal) return null;
  if (role !== "NURSE") return meal.servingsPlanned > 0 ? meal.servingsPlanned : null;
  const total = event.reports.flatMap((report) => report.lines)
    .filter((line) => line.dietTypeId === meal.dietTypeId)
    .reduce((sum, line) => sum + line.quantity, 0);
  return total > 0 ? total : null;
}
