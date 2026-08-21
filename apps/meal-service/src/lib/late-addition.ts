import type { AckStatus, AdditionKind, DietMealStatus, Prisma, Role } from "@prisma/client";
import { cutoffAt } from "./serving-report";
import { prisma } from "./prisma";

export const ACK_LABEL: Record<Exclude<AckStatus, "PENDING">, string> = {
  RECEIVED: "Đã nhận",
  INSUFFICIENT: "Không đủ",
  SUBSTITUTE: "Cần thay thế",
};

export function shouldLockMeal(mealDate: Date, cutoffTime: string, status: DietMealStatus, now = new Date()): boolean {
  const cutoff = cutoffAt(mealDate, cutoffTime);
  return status === "PLANNED" && cutoff !== null && now >= cutoff;
}

export function additionKindFor(status: DietMealStatus): AdditionKind {
  return status === "SERVED" ? "URGENT_POST_SERVE" : "SUPPLEMENT";
}

export function servingTotal(original: number, additions: Array<{ quantity: number }>): { original: number; additions: number; total: number } {
  if (!Number.isInteger(original) || original < 0) throw new Error("Số suất gốc không hợp lệ.");
  const extra = additions.reduce((sum, item) => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error("Số suất bổ sung phải là số nguyên dương.");
    return sum + item.quantity;
  }, 0);
  return { original, additions: extra, total: original + extra };
}

export function normalizeAdditionReason(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Lý do bổ sung là bắt buộc.");
  const reason = value.trim();
  if (reason.length > 500) throw new Error("Lý do bổ sung tối đa 500 ký tự.");
  return reason;
}

export function assertAckStatus(status: AckStatus): asserts status is Exclude<AckStatus, "PENDING"> {
  if (!(status in ACK_LABEL)) throw new Error("Trạng thái xác nhận của bếp không hợp lệ.");
}

type Actor = { id: string; displayName: string; role: Role };

export async function lockExpiredMealEvent(mealEventId: string, actor: Actor, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.mealEvent.findUnique({
      where: { id: mealEventId },
      include: { mealType: true, dietMeals: { where: { voidedAt: null }, select: { id: true, status: true } } },
    });
    if (!event) throw new Error("Không tìm thấy bữa ăn.");
    const lockable = event.dietMeals.filter((meal) => shouldLockMeal(event.mealDate, event.mealType.cutoffTime, meal.status, now));
    for (const meal of lockable) {
      await tx.dietMeal.update({ where: { id: meal.id }, data: { status: "LOCKED" } });
      await tx.auditLog.create({ data: { entityType: "DietMeal", entityId: meal.id, action: "CUTOFF_LOCK", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: "PLANNED" }, afterJson: { status: "LOCKED" }, reason: `Tự động khóa theo giờ chốt ${event.mealType.cutoffTime}` } });
    }
    const allSettledAtCutoff = event.dietMeals.every((meal) => meal.status === "LOCKED" || meal.status === "CANCELLED" || lockable.some((item) => item.id === meal.id));
    if (lockable.length > 0 && allSettledAtCutoff && event.status !== "LOCKED") {
      await tx.mealEvent.update({ where: { id: event.id }, data: { status: "LOCKED" } });
      await tx.auditLog.create({ data: { entityType: "MealEvent", entityId: event.id, action: "CUTOFF_LOCK", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: event.status }, afterJson: { status: "LOCKED" }, reason: `Tất cả chế độ đã khóa theo giờ chốt ${event.mealType.cutoffTime}` } });
    }
    return lockable.length;
  });
}

export async function createLateMealAddition(input: { mealEventId: string; departmentId: string; dietTypeId: string; quantity: number; reason: string }, actor: Actor, now = new Date()) {
  if (actor.role !== "NURSE") throw new Error("Chỉ điều dưỡng được báo suất bổ sung.");
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("Số suất bổ sung phải là số nguyên dương.");
  const reason = normalizeAdditionReason(input.reason);
  return prisma.$transaction(async (tx) => {
    const [membership, event, meal] = await Promise.all([
      tx.departmentMembership.findUnique({ where: { userId_departmentId: { userId: actor.id, departmentId: input.departmentId } }, select: { id: true } }),
      tx.mealEvent.findUnique({ where: { id: input.mealEventId }, include: { mealType: true } }),
      tx.dietMeal.findUnique({ where: { mealEventId_dietTypeId: { mealEventId: input.mealEventId, dietTypeId: input.dietTypeId } }, select: { id: true, status: true, voidedAt: true, servingsPlanned: true } }),
    ]);
    if (!membership) throw new Error("Bạn không có quyền báo bổ sung cho khoa này.");
    if (!event || !meal || meal.voidedAt) throw new Error("Không tìm thấy chế độ ăn đang hoạt động.");
    const cutoff = cutoffAt(event.mealDate, event.mealType.cutoffTime);
    if (meal.status !== "SERVED" && (!cutoff || now < cutoff)) throw new Error("Chỉ báo bổ sung sau giờ chốt. Trước giờ chốt hãy sửa báo suất gốc.");
    if (shouldLockMeal(event.mealDate, event.mealType.cutoffTime, meal.status, now)) {
      await tx.dietMeal.update({ where: { id: meal.id }, data: { status: "LOCKED" } });
      await tx.auditLog.create({ data: { entityType: "DietMeal", entityId: meal.id, action: "CUTOFF_LOCK", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: "PLANNED" }, afterJson: { status: "LOCKED" }, reason: `Tự động khóa trước khi ghi suất bổ sung, giờ chốt ${event.mealType.cutoffTime}` } });
    }
    const kind = additionKindFor(meal.status);
    const addition = await tx.lateMealAddition.create({ data: { ...input, reason, kind, submittedById: actor.id } });
    await tx.auditLog.create({ data: { entityType: "LateMealAddition", entityId: addition.id, action: "CREATE", actorId: actor.id, actorName: actor.displayName, afterJson: { mealEventId: input.mealEventId, departmentId: input.departmentId, dietTypeId: input.dietTypeId, quantity: input.quantity, reason, kind, ackStatus: "PENDING", originalServings: meal.servingsPlanned } as Prisma.InputJsonValue, reason } });
    return addition;
  }, { isolationLevel: "Serializable" });
}

export async function acknowledgeLateMealAddition(input: { additionId: string; ackStatus: AckStatus; kitchenNote: string | null }, actor: Actor, now = new Date()) {
  if (actor.role !== "KITCHEN") throw new Error("Chỉ bếp được xác nhận suất bổ sung.");
  assertAckStatus(input.ackStatus);
  const ackStatus = input.ackStatus;
  const kitchenNote = input.kitchenNote?.trim() || null;
  if (kitchenNote && kitchenNote.length > 500) throw new Error("Ghi chú bếp tối đa 500 ký tự.");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.lateMealAddition.findUnique({ where: { id: input.additionId } });
    if (!existing) throw new Error("Không tìm thấy suất bổ sung.");
    const updated = await tx.lateMealAddition.update({ where: { id: existing.id }, data: { ackStatus, ackById: actor.id, ackAt: now, kitchenNote } });
    await tx.auditLog.create({ data: { entityType: "LateMealAddition", entityId: existing.id, action: "KITCHEN_ACK", actorId: actor.id, actorName: actor.displayName, beforeJson: { ackStatus: existing.ackStatus, ackById: existing.ackById, ackAt: existing.ackAt, kitchenNote: existing.kitchenNote } as Prisma.InputJsonValue, afterJson: { ackStatus: updated.ackStatus, ackById: updated.ackById, ackAt: updated.ackAt, kitchenNote: updated.kitchenNote } as Prisma.InputJsonValue, reason: `Bếp xác nhận: ${ACK_LABEL[ackStatus]}` } });
    return updated;
  });
}
