import "server-only";
import { prisma } from "./prisma";
import { mealTimeMilestones } from "./meal-events";
import { hospitalDate } from "./serving-report";

export async function synchronizeSystemTimeline(actor: { id: string; displayName: string }, now = new Date()) {
  const day = hospitalDate(now);
  const events = await prisma.mealEvent.findMany({ where: { mealDate: day }, select: { id: true, mealType: { select: { cutoffTime: true, serviceTime: true } } } });
  for (const event of events) {
    const times = mealTimeMilestones(day, event.mealType.cutoffTime, event.mealType.serviceTime);
    if (!times) continue;
    const milestones = [{ action: "SYSTEM_PHASE_PREPARING", status: "PREPARING", occurredAt: times.cutoffAt }, { action: "SYSTEM_PHASE_SERVING", status: "SERVING", occurredAt: times.serviceAt }];
    for (const milestone of milestones) {
      if (now < milestone.occurredAt) continue;
      await prisma.$transaction(async (tx) => {
        const exists = await tx.auditLog.findFirst({ where: { entityType: "MealEvent", entityId: event.id, action: milestone.action }, select: { id: true } });
        if (exists) return;
        await tx.auditLog.create({ data: { entityType: "MealEvent", entityId: event.id, action: milestone.action, actorId: actor.id, actorName: actor.displayName, afterJson: { status: milestone.status, occurredAt: milestone.occurredAt.toISOString(), source: "SYSTEM" }, reason: `Hệ thống ghi mốc theo giờ cấu hình: ${milestone.status}` } });
      });
    }
  }
}
