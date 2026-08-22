import type { DietMealStatus } from "@prisma/client";
import { buildDietMealShopping } from "@/lib/kitchen";
import { servingTotal } from "@/lib/late-addition";
import { evidenceStorage } from "@/lib/evidence-storage";
import { prisma } from "@/lib/prisma";

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

function vnDateKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function vnMinuteOfDay(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function timeToMinute(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : Number.POSITIVE_INFINITY;
}

const STATUS_ORDER: DietMealStatus[] = ["PLANNED", "LOCKED", "PREPARING", "PREPARED", "SERVED"];

function rollupStatus(statuses: DietMealStatus[]): DietMealStatus {
  const active = statuses.filter((status) => status !== "CANCELLED");
  if (active.length === 0) return "CANCELLED";
  return active.reduce((earliest, status) =>
    STATUS_ORDER.indexOf(status) < STATUS_ORDER.indexOf(earliest) ? status : earliest,
  );
}

const eventInclude = {
  mealType: true,
  additions: { orderBy: { submittedAt: "desc" as const }, include: { department: true, dietType: true } },
  dietMeals: {
    where: { voidedAt: null },
    orderBy: { dietType: { sortOrder: "asc" as const } },
    select: {
      id: true,
      dietTypeId: true,
      feedingRoute: true,
      menuSnapshotJson: true,
      servingsPlanned: true,
      status: true,
      dietType: true,
      evidence: { orderBy: { uploadedAt: "desc" as const } },
    },
  },
} as const;

export async function readKitchenWorkspace(requestedMealId?: string, now = new Date()) {
  const today = new Date(`${vnDateKey(now)}T00:00:00.000Z`);
  let events = await prisma.mealEvent.findMany({
    where: { mealDate: today },
    orderBy: { mealType: { sortOrder: "asc" } },
    include: eventInclude,
  });

  if (events.length === 0) {
    const next = await prisma.mealEvent.findFirst({
      where: { mealDate: { gt: today } },
      orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }],
      select: { mealDate: true },
    });
    if (next) {
      events = await prisma.mealEvent.findMany({
        where: { mealDate: next.mealDate },
        orderBy: { mealType: { sortOrder: "asc" } },
        include: eventInclude,
      });
    }
  }

  const summaries = events.map((event) => ({
    id: event.id,
    name: event.mealType.name,
    serviceTime: event.mealType.serviceTime,
    status: rollupStatus(event.dietMeals.map((meal) => meal.status)),
  }));
  const currentMinute = vnMinuteOfDay(now);
  const defaultEvent = events.find((event) => event.dietMeals.some((meal) => meal.status === "PREPARING"))
    ?? events.find((event) => event.dietMeals.some((meal) => meal.status === "PREPARED"))
    ?? events.find((event) => timeToMinute(event.mealType.serviceTime) >= currentMinute && event.dietMeals.some((meal) => !["SERVED", "CANCELLED"].includes(meal.status)))
    ?? [...events].reverse().find((event) => event.dietMeals.some((meal) => meal.status !== "CANCELLED"))
    ?? events[0];
  const selected = events.find((event) => event.id === requestedMealId) ?? defaultEvent ?? null;

  if (!selected) return { events: summaries, selected: null };
  const shopping = buildDietMealShopping(selected.dietMeals.map((meal) => ({
    id: meal.id,
    dietTypeId: meal.dietTypeId,
    dietName: meal.dietType.name,
    servingsPlanned: servingTotal(meal.servingsPlanned, selected.additions.filter((addition) => addition.dietTypeId === meal.dietTypeId)).total,
    menuSnapshotJson: meal.menuSnapshotJson,
  })));
  const evidence = selected.dietMeals.flatMap((meal) => meal.evidence.map((item) => ({
    ...item,
    dietName: meal.dietType.name,
    publicUrl: evidenceStorage.publicUrl(item.storagePath),
  })));
  return { events: summaries, selected: { ...selected, shopping, evidence } };
}
