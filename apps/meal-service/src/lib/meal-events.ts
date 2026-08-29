import type { DietMealStatus, FeedingRoute, Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { readOperationalSettings } from "./settings";

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

export type DisplayMealState = {
  key: "UPCOMING" | "REPORTING" | "PREPARATION" | "SERVICE" | "CLOSED" | "INCOMPLETE";
  label: string;
  tone: "muted" | "neutral" | "warning" | "active" | "done" | "danger";
  isCurrent: boolean;
};

export function hospitalDayKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function atVietnamTime(mealDate: Date, value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return Date.UTC(mealDate.getUTCFullYear(), mealDate.getUTCMonth(), mealDate.getUTCDate(), hour - 7, minute);
}

export const DEFAULT_SERVICE_COMPLETION_MINUTES = 60;

export type MealTimeMilestones = {
  cutoffAt: Date;
  serviceAt: Date;
  completionAt: Date;
};

/** Các mốc tuyệt đối của một bữa, dùng chung cho hiển thị và AuditLog hệ thống. */
export function mealTimeMilestones(
  mealDate: Date,
  cutoffTime: string,
  serviceTime: string,
  completionMinutes = DEFAULT_SERVICE_COMPLETION_MINUTES,
): MealTimeMilestones | null {
  const cutoffAt = atVietnamTime(mealDate, cutoffTime);
  const serviceAt = atVietnamTime(mealDate, serviceTime);
  if (cutoffAt === null || serviceAt === null || serviceAt < cutoffAt) return null;
  return {
    cutoffAt: new Date(cutoffAt),
    serviceAt: new Date(serviceAt),
    completionAt: new Date(serviceAt + completionMinutes * 60_000),
  };
}

/**
 * Mốc giờ của một bữa — NGUỒN SỰ THẬT DUY NHẤT về thời gian trong toàn hệ thống.
 * Thuần thời gian, không xét trạng thái lưu. Mọi màn (điều dưỡng / bếp / dinh dưỡng /
 * admin / lịch) phải dùng hàm này; KHÔNG viết bộ logic giờ thứ hai.
 */
export type MealTimePhase = "BEFORE_CUTOFF" | "PREPARING" | "SERVING" | "PASSED";
export type MealPhase = "REPORTING" | "PREPARATION" | "SERVICE" | "CLOSED";

export const MEAL_PHASE_LABEL: Record<MealTimePhase, string> = { BEFORE_CUTOFF: "Báo suất ăn", PREPARING: "Bếp đang chuẩn bị", SERVING: "Đang phục vụ", PASSED: "Đã kết thúc" };

export function mealTimePhase(mealDate: Date, cutoffTime: string, serviceTime: string, now = new Date(), completionMinutes = DEFAULT_SERVICE_COMPLETION_MINUTES): MealTimePhase | null {
  const milestones = mealTimeMilestones(mealDate, cutoffTime, serviceTime, completionMinutes);
  if (milestones === null) return null;
  const cutoffAt = milestones.cutoffAt.getTime();
  const serviceAt = milestones.serviceAt.getTime();
  const nowMs = now.getTime();
  if (nowMs < cutoffAt) return "BEFORE_CUTOFF";
  if (nowMs < serviceAt) return "PREPARING";
  if (nowMs < milestones.completionAt.getTime()) return "SERVING";
  return "PASSED";
}

export function getMealPhase(mealDate: Date, cutoffTime: string, serviceTime: string, effectiveTime = new Date(), completionMinutes = DEFAULT_SERVICE_COMPLETION_MINUTES): MealPhase | null {
  const phase = mealTimePhase(mealDate, cutoffTime, serviceTime, effectiveTime, completionMinutes);
  if (phase === "BEFORE_CUTOFF") return "REPORTING";
  if (phase === "PREPARING") return "PREPARATION";
  if (phase === "SERVING") return "SERVICE";
  if (phase === "PASSED") return "CLOSED";
  return null;
}

export function isKitchenPreparationOpen(mealDate: Date, cutoffTime: string, serviceTime: string, now = new Date(), completionMinutes = DEFAULT_SERVICE_COMPLETION_MINUTES): boolean {
  const phase = mealTimePhase(mealDate, cutoffTime, serviceTime, now, completionMinutes);
  return phase !== null && phase !== "BEFORE_CUTOFF";
}

export function displayMealState(mealDate: Date, cutoffTime: string, serviceTime: string, storedStatus: DietMealStatus | null, now = new Date(), completionMinutes = DEFAULT_SERVICE_COMPLETION_MINUTES): DisplayMealState | null {
  if (storedStatus === null || storedStatus === "CANCELLED") return null;
  const phase = getMealPhase(mealDate, cutoffTime, serviceTime, now, completionMinutes);
  if (phase === null) return { key: "INCOMPLETE", label: "⚠ Chưa hoàn tất", tone: "danger", isCurrent: false };
  if (phase === "CLOSED") return { key: "CLOSED", label: "Đã đóng", tone: "muted", isCurrent: false };
  if (phase === "SERVICE") return { key: "SERVICE", label: "Đang phục vụ", tone: "active", isCurrent: true };
  if (phase === "PREPARATION") return { key: "PREPARATION", label: "Giai đoạn chuẩn bị", tone: "warning", isCurrent: true };
  if (toDateKey(mealDate) > hospitalDayKey(now)) return { key: "UPCOMING", label: "Chưa tới", tone: "muted", isCurrent: false };
  return { key: "REPORTING", label: "Đang nhận báo suất", tone: "neutral", isCurrent: false };
}

/**
 * Chọn bữa để hiển thị trên thanh vòng đời: bữa đang chạy → bữa sắp tới → hết bữa
 * trong ngày thì cuốn sang bữa đầu của vòng kế (nextCycle = true).
 */
export type LifecycleMeal = { cutoffTime: string; serviceTime: string; mealDate: Date; status: DietMealStatus | null };

export type ReportingMeal = { cutoffTime: string; serviceTime: string; mealDate: Date };

/** Trong giờ phục vụ, điều dưỡng giữ bữa hiện tại ở trạng thái khóa. Hết thời lượng phục vụ mới chuyển sang bữa còn nhận báo tiếp theo. */
export function pickReportingMeal<T extends ReportingMeal>(meals: T[], now = new Date(), completionMinutes = DEFAULT_SERVICE_COMPLETION_MINUTES): T | null {
  if (meals.length === 0) return null;
  const serving = meals.find((meal) => mealTimePhase(meal.mealDate, meal.cutoffTime, meal.serviceTime, now, completionMinutes) === "SERVING");
  if (serving) return serving;
  const preparing = meals.find((meal) => mealTimePhase(meal.mealDate, meal.cutoffTime, meal.serviceTime, now, completionMinutes) === "PREPARING");
  if (preparing) return preparing;
  const receiving = meals.find((meal) => mealTimePhase(meal.mealDate, meal.cutoffTime, meal.serviceTime, now, completionMinutes) === "BEFORE_CUTOFF");
  return receiving ?? meals.at(-1) ?? null;
}

export function nextReportingCutoff<T extends ReportingMeal>(meals: T[], now = new Date()): { meal: T; at: Date } | null {
  for (const meal of meals) {
    const cutoffAt = atVietnamTime(meal.mealDate, meal.cutoffTime);
    if (cutoffAt !== null && cutoffAt > now.getTime()) return { meal, at: new Date(cutoffAt) };
  }
  return null;
}

export type MealTimelineEvent<T extends ReportingMeal> = {
  meal: T;
  at: Date;
  kind: "CUTOFF" | "SERVICE";
};

/** Mốc vận hành gần nhất của toàn hệ thống: giờ chốt hoặc giờ phục vụ, tùy mốc nào đến trước. */
export function nextMealTimelineEvent<T extends ReportingMeal>(meals: T[], now = new Date()): MealTimelineEvent<T> | null {
  const nowMs = now.getTime();
  let next: MealTimelineEvent<T> | null = null;

  for (const meal of meals) {
    const candidates = [
      { kind: "CUTOFF" as const, at: atVietnamTime(meal.mealDate, meal.cutoffTime) },
      { kind: "SERVICE" as const, at: atVietnamTime(meal.mealDate, meal.serviceTime) },
    ];

    for (const candidate of candidates) {
      if (candidate.at === null || candidate.at <= nowMs) continue;
      if (next === null || candidate.at < next.at.getTime()) {
        next = { meal, kind: candidate.kind, at: new Date(candidate.at) };
      }
    }
  }

  return next;
}

export function pickLifecycleMeal<T extends LifecycleMeal>(meals: T[], now = new Date(), completionMinutes = DEFAULT_SERVICE_COMPLETION_MINUTES): { meal: T; nextCycle: boolean } | null {
  if (meals.length === 0) return null;
  const stateOf = (meal: T) => displayMealState(meal.mealDate, meal.cutoffTime, meal.serviceTime, meal.status, now, completionMinutes);
  const running = meals.find((meal) => stateOf(meal)?.isCurrent);
  if (running) return { meal: running, nextCycle: false };
  const upcoming = meals.find((meal) => { const key = stateOf(meal)?.key; return key === "REPORTING" || key === "UPCOMING"; });
  if (upcoming) return { meal: upcoming, nextCycle: false };
  return { meal: meals[0], nextCycle: true };
}

/** Chọn bữa vận hành theo lifecycle; query cũ không được ghim Bếp ở bữa đã qua. */
export function pickOperationalMeal<T extends LifecycleMeal & { id: string }>(
  meals: T[],
  requestedMealId: string | undefined,
  now = new Date(),
  completionMinutes = DEFAULT_SERVICE_COMPLETION_MINUTES,
): T | null {
  const current = pickLifecycleMeal(meals, now, completionMinutes)?.meal ?? null;
  if (!current) return null;
  return requestedMealId === current.id ? meals.find((meal) => meal.id === requestedMealId) ?? current : current;
}

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
  if (requested.getTime() <= current.getTime()) return requested;
  return key === toDateKey(next) ? next : current;
}

export async function ensureEmptyMealEvents(
  weekStart: Date,
  actor: { id: string; displayName: string },
) {
  const [mealTypes, allDietTypes, settings] = await Promise.all([
    prisma.mealType.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } }),
    prisma.dietType.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } }),
    readOperationalSettings(),
  ]);
  const visibleMealTypes = mealTypes.filter((item) => settings.sondeEnabled || item.feedingRoute === "NORMAL");
  const dietTypes = allDietTypes.filter((item) => settings.sondeEnabled || item.feedingRoute === "NORMAL");
  if (mealTypes.length === 0 || dietTypes.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (let day = 0; day < 7; day += 1) {
      const mealDate = addDays(weekStart, day);
      for (const mealType of visibleMealTypes) {
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
        for (const dietType of dietTypes.filter((item) => item.feedingRoute === mealType.feedingRoute)) {
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
    where: { mealDate: { gte: weekStart, lt: addDays(weekStart, 7) }, ...(feedingRoute ? { mealType: { feedingRoute } } : {}) },
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
