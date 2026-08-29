import type { DeliveryReceiptStatus, Prisma, Role } from "@prisma/client";
import { mealTimePhase } from "./meal-events";
import { prisma } from "./prisma";
import { readOperationalSettings } from "./settings";
import { isDemoTourScenarioMeal, readDemoSession, updateDemoState } from "./demo-session";

export function normalizeDeliveryReceipt(input: { status: unknown; receivedQuantity: unknown; expectedQuantity: number; note: unknown }) {
  const status = String(input.status ?? "") as DeliveryReceiptStatus;
  const receivedQuantity = Number(input.receivedQuantity);
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim() : null;
  if (!Number.isInteger(input.expectedQuantity) || input.expectedQuantity < 0) throw new Error("Chưa có số suất dự kiến hợp lệ để xác nhận.");
  if (!Number.isInteger(receivedQuantity) || receivedQuantity < 0) throw new Error("Số suất thực nhận phải là số nguyên không âm.");
  if (status === "FULL" && receivedQuantity !== input.expectedQuantity) throw new Error("Xác nhận nhận đủ phải khớp số suất dự kiến.");
  if (status === "SHORT" && receivedQuantity >= input.expectedQuantity) throw new Error("Nhận thiếu phải nhỏ hơn số suất dự kiến.");
  if (status === "SHORT" && (!note || note.length < 3)) throw new Error("Cần ghi lý do khi nhận thiếu.");
  if (!(["FULL", "SHORT"] as string[]).includes(status)) throw new Error("Trạng thái giao nhận không hợp lệ.");
  if (note && note.length > 500) throw new Error("Ghi chú giao nhận tối đa 500 ký tự.");
  return { status, receivedQuantity, note };
}

export function normalizeReceiptCorrectionReason(value: unknown) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < 3) throw new Error("Cần ghi lý do khi sửa xác nhận giao nhận.");
  if (reason.length > 500) throw new Error("Lý do điều chỉnh tối đa 500 ký tự.");
  return reason;
}

export async function confirmMealDelivery(
  input: { mealEventId: string; departmentId: string; status: unknown; receivedQuantity: unknown; note: unknown; correctionReason?: unknown },
  actor: { id: string; displayName: string; role: Role; demoSessionId?: string },
  now = new Date(),
) {
  if (actor.role !== "NURSE") throw new Error("Chỉ điều dưỡng được xác nhận giao nhận của khoa.");
  const [membership, event, settings] = await Promise.all([
    prisma.departmentMembership.findUnique({ where: { userId_departmentId: { userId: actor.id, departmentId: input.departmentId } }, select: { id: true } }),
    prisma.mealEvent.findUnique({ where: { id: input.mealEventId }, select: { id: true, mealDate: true, mealType: { select: { cutoffTime: true, serviceTime: true } }, reports: { where: { departmentId: input.departmentId, status: "SUBMITTED" }, select: { lines: { select: { quantity: true } } } }, additions: { where: { departmentId: input.departmentId, ackStatus: { in: ["RECEIVED", "SUBSTITUTE"] } }, select: { quantity: true } } } }),
    readOperationalSettings(),
  ]);
  if (!membership) throw new Error("Bạn không có quyền xác nhận giao nhận cho khoa này.");
  if (!event) throw new Error("Không tìm thấy bữa ăn cần xác nhận.");
  const phase = mealTimePhase(event.mealDate, event.mealType.cutoffTime, event.mealType.serviceTime, now, settings.serviceCompletionMinutes);
  if (phase !== "SERVING" && phase !== "PASSED") throw new Error("Chưa tới giờ phục vụ nên chưa thể xác nhận giao nhận.");
  const demo = actor.demoSessionId ? await readDemoSession() : null;
  const demoReport = demo?.state.reports.find((item) => item.mealEventId === input.mealEventId && item.departmentId === input.departmentId);
  const scenario = demo ? isDemoTourScenarioMeal(demo.state, input.mealEventId) : false;
  if ((scenario || event.reports.length === 0) && !demoReport) throw new Error("Khoa chưa có báo suất đã chốt cho bữa này.");
  const acceptedAdditions = scenario
    ? demo?.state.additions.filter((item) => item.mealEventId === input.mealEventId && item.departmentId === input.departmentId && (item.ackStatus === "RECEIVED" || item.ackStatus === "SUBSTITUTE")).reduce((sum, item) => sum + item.quantity, 0) ?? 0
    : event.additions.reduce((sum, item) => sum + item.quantity, 0);
  const expectedQuantity = (demoReport ? demoReport.lines : event.reports.flatMap((report) => report.lines)).reduce((sum, line) => sum + line.quantity, 0) + acceptedAdditions;
  const normalized = normalizeDeliveryReceipt({ ...input, expectedQuantity });
  if (actor.demoSessionId) {
    const existing = demo?.state.receipts.find((item) => item.mealEventId === input.mealEventId && item.departmentId === input.departmentId);
    if (existing) normalizeReceiptCorrectionReason(input.correctionReason);
    const receipt = { mealEventId: input.mealEventId, departmentId: input.departmentId, expectedQuantity, ...normalized, confirmedAt: now.toISOString(), confirmedBy: actor.displayName };
    await updateDemoState((state) => { state.receipts = state.receipts.filter((item) => !(item.mealEventId === input.mealEventId && item.departmentId === input.departmentId)); state.receipts.push(receipt); });
    return { id: `demo-receipt:${input.mealEventId}:${input.departmentId}`, ...receipt };
  }
  return prisma.$transaction(async (tx) => {
    const existing = await tx.mealDeliveryReceipt.findUnique({ where: { departmentId_mealEventId: { departmentId: input.departmentId, mealEventId: input.mealEventId } } });
    const unchanged = existing && existing.expectedQuantity === expectedQuantity && existing.receivedQuantity === normalized.receivedQuantity && existing.status === normalized.status && existing.note === normalized.note;
    if (unchanged) return existing;
    const correctionReason = existing ? normalizeReceiptCorrectionReason(input.correctionReason) : null;
    const receipt = await tx.mealDeliveryReceipt.upsert({ where: { departmentId_mealEventId: { departmentId: input.departmentId, mealEventId: input.mealEventId } }, create: { departmentId: input.departmentId, mealEventId: input.mealEventId, expectedQuantity, ...normalized, confirmedById: actor.id, confirmedAt: now }, update: { expectedQuantity, ...normalized, confirmedById: actor.id, confirmedAt: now } });
    const beforeJson = existing ? { expectedQuantity: existing.expectedQuantity, receivedQuantity: existing.receivedQuantity, status: existing.status, note: existing.note, confirmedById: existing.confirmedById, confirmedAt: existing.confirmedAt.toISOString() } satisfies Prisma.InputJsonValue : undefined;
    await tx.auditLog.create({ data: { entityType: "MealDeliveryReceipt", entityId: receipt.id, action: existing ? "UPDATE" : "CREATE", actorId: actor.id, actorName: actor.displayName, beforeJson, afterJson: { departmentId: input.departmentId, mealEventId: input.mealEventId, expectedQuantity, ...normalized, confirmedById: actor.id, confirmedAt: now.toISOString() }, reason: existing ? `Điều chỉnh xác nhận giao nhận: ${correctionReason}` : normalized.status === "FULL" ? "Khoa xác nhận đã nhận đủ suất" : `Khoa xác nhận nhận thiếu: ${normalized.note}` } });
    return receipt;
  }, { isolationLevel: "Serializable" });
}
