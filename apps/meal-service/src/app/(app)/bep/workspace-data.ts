import { buildDietMealShopping } from "@/lib/kitchen";
import { hospitalDayKey, isKitchenPreparationOpen, pickLifecycleMeal, rollupMealEventStatus } from "@/lib/meal-events";
import { servingTotal } from "@/lib/late-addition";
import { evidenceStorage } from "@/lib/evidence-storage";
import { prisma } from "@/lib/prisma";
import { mealTimesForRoute, readOperationalSettings } from "@/lib/settings";


const eventInclude = {
  mealType: true,
  additions: { orderBy: { submittedAt: "desc" as const }, include: { department: true, dietType: true } },
  reports: { where: { status: "SUBMITTED" as const }, select: { departmentId: true, department: { select: { name: true } }, lines: { select: { dietTypeId: true, quantity: true } } } },
  dietMeals: {
    where: { voidedAt: null },
    orderBy: { dietType: { sortOrder: "asc" as const } },
    select: {
      id: true,
      dietTypeId: true,
      feedingRoute: true,
      menuSnapshotJson: true,
      patientVisibleNote: true,
      servingsPlanned: true,
      status: true,
      dietType: true,
      evidence: { orderBy: { uploadedAt: "desc" as const } },
    },
  },
} as const;

export async function readKitchenWorkspace(requestedMealId?: string, feedingRoute: "NORMAL" | "SONDE" = "NORMAL", now = new Date()) {
  const settings = await readOperationalSettings();
  const today = new Date(`${hospitalDayKey(now)}T00:00:00.000Z`);
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

  events = events.map((event) => ({ ...event, mealType: { ...event.mealType, ...mealTimesForRoute(settings, event.mealType, feedingRoute) }, dietMeals: event.dietMeals.filter((meal) => meal.feedingRoute === feedingRoute), additions: event.additions.filter((addition) => addition.dietType.feedingRoute === feedingRoute) }));
  const summaries = events.map((event) => ({
    id: event.id,
    name: event.mealType.name,
    serviceTime: event.mealType.serviceTime,
    status: rollupMealEventStatus(event.dietMeals.map((meal) => meal.status)) ?? "CANCELLED",
  }));
  const lifecycle = pickLifecycleMeal(events.map((event) => ({ event, mealDate: event.mealDate, cutoffTime: event.mealType.cutoffTime, serviceTime: event.mealType.serviceTime, status: rollupMealEventStatus(event.dietMeals.map((meal) => meal.status)) })), now, settings.serviceCompletionMinutes);
  const defaultEvent = lifecycle?.meal.event ?? events[0];
  const selected = events.find((event) => event.id === requestedMealId) ?? defaultEvent ?? null;

  if (!selected) return { events: summaries, selected: null, canOperate: false };
  const shopping = buildDietMealShopping(selected.dietMeals.map((meal) => ({
    id: meal.id,
    dietTypeId: meal.dietTypeId,
    dietName: meal.dietType.name,
    servingsPlanned: servingTotal(meal.servingsPlanned, selected.additions.filter((addition) => addition.dietTypeId === meal.dietTypeId && addition.ackStatus === "RECEIVED")).total,
    menuSnapshotJson: meal.menuSnapshotJson,
  })));
  const evidence = selected.dietMeals.flatMap((meal) => meal.evidence.map((item) => ({
    ...item,
    dietName: meal.dietType.name,
    publicUrl: evidenceStorage.publicUrl(item.storagePath),
  })));
  return { events: summaries, selected: { ...selected, shopping, evidence }, canOperate: isKitchenPreparationOpen(selected.mealDate, selected.mealType.cutoffTime, selected.mealType.serviceTime, now, settings.serviceCompletionMinutes) };
}
