import type { DietMealStatus, FeedingRoute, Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";

export type HandoffSnapshot = { departmentId: string; quantity: number };

export function handoffPersistenceDecision(existingQuantity: number | null, nextQuantity: number) {
  if (existingQuantity === null) return "CREATE" as const;
  return existingQuantity === nextQuantity ? "UNCHANGED" as const : "UPDATE" as const;
}

type HandoffSource = {
  route: FeedingRoute;
  dietStatuses: readonly DietMealStatus[];
  reports: ReadonlyArray<{ departmentId: string; quantities: readonly number[] }>;
  additions: ReadonlyArray<{ departmentId: string; quantity: number }>;
};

export function deriveHandoffSnapshots(source: HandoffSource, kitchenRoute: FeedingRoute): HandoffSnapshot[] {
  if (source.route !== kitchenRoute) return [];
  if (source.dietStatuses.length === 0 || source.dietStatuses.some((status) => status !== "PREPARED")) return [];
  const quantities = new Map<string, number>();
  for (const report of source.reports) quantities.set(report.departmentId, report.quantities.reduce((sum, quantity) => sum + quantity, 0));
  for (const addition of source.additions) quantities.set(addition.departmentId, (quantities.get(addition.departmentId) ?? 0) + addition.quantity);
  return [...quantities.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([departmentId, quantity]) => ({ departmentId, quantity }))
    .sort((left, right) => left.departmentId.localeCompare(right.departmentId));
}

export function buildHandoffSnapshots(source: HandoffSource, kitchenRoute: FeedingRoute): HandoffSnapshot[] {
  if (source.route !== kitchenRoute) throw new Error("Bữa ăn không thuộc phạm vi của bếp này.");
  if (source.dietStatuses.length === 0 || source.dietStatuses.some((status) => status !== "PREPARED")) {
    throw new Error("Chỉ được bàn giao khi toàn bộ mã chế độ ăn đã sẵn sàng giao.");
  }
  const snapshots = deriveHandoffSnapshots(source, kitchenRoute);
  if (snapshots.length === 0) throw new Error("Chưa có số suất của khoa để bàn giao.");
  return snapshots;
}

export async function handoffMealEvent(
  input: { mealEventId: string; feedingRoute: FeedingRoute },
  actor: { id: string; displayName: string; role: Role; kitchenRoute: FeedingRoute | null },
  now = new Date(),
) {
  if (actor.role !== "KITCHEN" || !actor.kitchenRoute || actor.kitchenRoute !== input.feedingRoute) throw new Error("Tài khoản bếp không có quyền bàn giao cho luồng này.");
  const event = await prisma.mealEvent.findUnique({
    where: { id: input.mealEventId },
    select: {
      id: true,
      mealType: { select: { feedingRoute: true } },
      dietMeals: { where: { feedingRoute: input.feedingRoute, voidedAt: null }, select: { status: true } },
      reports: { where: { status: "SUBMITTED" }, select: { departmentId: true, lines: { where: { dietType: { feedingRoute: input.feedingRoute } }, select: { quantity: true } } } },
      additions: { where: { ackStatus: { in: ["RECEIVED", "SUBSTITUTE"] }, dietType: { feedingRoute: input.feedingRoute } }, select: { departmentId: true, quantity: true } },
    },
  });
  if (!event) throw new Error("Không tìm thấy bữa ăn cần bàn giao.");
  const snapshots = buildHandoffSnapshots({ route: event.mealType.feedingRoute, dietStatuses: event.dietMeals.map((meal) => meal.status), reports: event.reports.map((report) => ({ departmentId: report.departmentId, quantities: report.lines.map((line) => line.quantity) })), additions: event.additions }, input.feedingRoute);
  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const snapshot of snapshots) {
      const key = { mealEventId_departmentId: { mealEventId: event.id, departmentId: snapshot.departmentId } };
      const existing = await tx.mealHandoff.findUnique({ where: key });
      const decision = handoffPersistenceDecision(existing?.quantity ?? null, snapshot.quantity);
      if (decision === "UNCHANGED" && existing) { results.push(existing); continue; }
      const handoff = await tx.mealHandoff.upsert({
        where: key,
        create: { mealEventId: event.id, departmentId: snapshot.departmentId, quantity: snapshot.quantity, handedOffAt: now, handedOffById: actor.id },
        update: { quantity: snapshot.quantity, handedOffAt: now, handedOffById: actor.id },
      });
      const beforeJson = existing ? { quantity: existing.quantity, handedOffAt: existing.handedOffAt.toISOString(), handedOffById: existing.handedOffById } satisfies Prisma.InputJsonValue : undefined;
      await tx.auditLog.create({ data: { entityType: "MealHandoff", entityId: handoff.id, action: decision === "UPDATE" ? "KITCHEN_HANDOFF_UPDATE" : "KITCHEN_HANDOFF_CREATE", actorId: actor.id, actorName: actor.displayName, beforeJson, afterJson: { mealEventId: event.id, departmentId: snapshot.departmentId, feedingRoute: input.feedingRoute, quantity: snapshot.quantity, handedOffAt: now.toISOString(), handedOffById: actor.id }, reason: decision === "UPDATE" ? "Bếp cập nhật số suất bàn giao cho khoa" : "Bếp xác nhận bàn giao suất ăn cho khoa" } });
      results.push(handoff);
    }
    return results;
  }, { isolationLevel: "Serializable" });
}
