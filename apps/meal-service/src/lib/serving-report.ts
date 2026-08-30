import type { FeedingRoute, Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { readOperationalSettings } from "./settings";
import { readDemoSession, updateDemoState } from "./demo-session";

export type ServingLineInput = { dietTypeId: string; quantity: number; internalNote: string | null; patientVisibleNote: string | null };
type ServingSnapshot = { status: "SUBMITTED"; departmentId: string; mealEventId: string; reportedByName: string | null; lines: ServingLineInput[] };

export function normalizeReporterName(value: unknown): string {
  if (typeof value !== "string") throw new Error("Cần nhập tên người trực tiếp báo suất.");
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 100) throw new Error("Tên người báo phải có từ 2 đến 100 ký tự.");
  return name;
}

export function requireNurseDepartment(role: Role, departmentIds: string[]): string {
  if (role !== "NURSE") throw new Error("Chỉ điều dưỡng được báo suất.");
  const unique = [...new Set(departmentIds)];
  if (unique.length === 0) throw new Error("Tài khoản chưa được gán khoa nên không thể báo suất.");
  if (unique.length > 1) throw new Error("Tài khoản được gán nhiều khoa. Quản trị cần giữ đúng một khoa trước khi báo suất.");
  return unique[0];
}

export function aggregateHospitalServings(lines: Array<{ dietTypeId: string; quantity: number }>): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 0) throw new Error("Số suất phải là số nguyên không âm.");
    totals.set(line.dietTypeId, (totals.get(line.dietTypeId) ?? 0) + line.quantity);
  }
  return totals;
}

export function normalizeServingNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.trim();
  if (!note) return null;
  if (note.length > 500) throw new Error("Mỗi ghi chú tối đa 500 ký tự.");
  return note;
}

export function cutoffAt(mealDate: Date, cutoffTime: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(cutoffTime);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return new Date(Date.UTC(mealDate.getUTCFullYear(), mealDate.getUTCMonth(), mealDate.getUTCDate(), hour - 7, minute));
}

export function isBeforeCutoff(mealDate: Date, cutoffTime: string, now = new Date()): boolean {
  const cutoff = cutoffAt(mealDate, cutoffTime);
  return cutoff !== null && now < cutoff;
}

export function buildServingSnapshot(report: { departmentId: string; mealEventId: string; reportedByName?: string | null; lines: ServingLineInput[] }): ServingSnapshot {
  return { status: "SUBMITTED", departmentId: report.departmentId, mealEventId: report.mealEventId, reportedByName: report.reportedByName ?? null, lines: report.lines.map((line) => ({ ...line })).sort((a, b) => a.dietTypeId.localeCompare(b.dietTypeId)) };
}

export function cutoffServingTotals(lines: Array<{ dietTypeId: string; quantity: number }>) {
  return [...aggregateHospitalServings(lines).entries()]
    .map(([dietTypeId, quantity]) => ({ dietTypeId, quantity }))
    .sort((a, b) => a.dietTypeId.localeCompare(b.dietTypeId));
}

/** Chốt snapshot số suất đúng một lần sau giờ chốt; không dùng cho Demo Clock. */
export async function materializeServingCutoffSnapshot(
  mealEventId: string,
  actor: { id: string; displayName: string; demoSessionId?: string },
  now = new Date(),
) {
  if (actor.demoSessionId) return false;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "MealEvent" WHERE "id" = ${mealEventId} FOR UPDATE`;
    const event = await tx.mealEvent.findUnique({
      where: { id: mealEventId },
      include: {
        mealType: { select: { cutoffTime: true } },
        dietMeals: { where: { voidedAt: null }, select: { id: true, dietTypeId: true, servingsPlanned: true } },
        reports: { where: { status: "SUBMITTED" }, select: { lines: { select: { dietTypeId: true, quantity: true } } } },
      },
    });
    if (!event || isBeforeCutoff(event.mealDate, event.mealType.cutoffTime, now)) return false;
    const existing = await tx.auditLog.findFirst({
      where: { entityType: "MealEvent", entityId: mealEventId, action: "SERVING_CUTOFF_SNAPSHOT" },
      select: { id: true },
    });
    if (existing) return false;
    const totals = new Map(cutoffServingTotals(event.reports.flatMap((report) => report.lines)).map((item) => [item.dietTypeId, item.quantity]));
    const before = event.dietMeals.map((meal) => ({ dietTypeId: meal.dietTypeId, quantity: meal.servingsPlanned }));
    const after = event.dietMeals.map((meal) => ({ dietTypeId: meal.dietTypeId, quantity: totals.get(meal.dietTypeId) ?? 0 }));
    for (const meal of event.dietMeals) {
      const quantity = totals.get(meal.dietTypeId) ?? 0;
      if (quantity !== meal.servingsPlanned) await tx.dietMeal.update({ where: { id: meal.id }, data: { servingsPlanned: quantity } });
    }
    await tx.auditLog.create({
      data: {
        entityType: "MealEvent",
        entityId: mealEventId,
        action: "SERVING_CUTOFF_SNAPSHOT",
        actorId: actor.id,
        actorName: actor.displayName,
        beforeJson: before as unknown as Prisma.InputJsonValue,
        afterJson: after as unknown as Prisma.InputJsonValue,
        reason: "Chốt số suất chính thức theo báo cáo khoa tại giờ chốt",
      },
    });
    return true;
  }, { isolationLevel: "Serializable" });
}

export function hospitalDate(now = new Date()): Date {
  const vietnam = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(vietnam.getUTCFullYear(), vietnam.getUTCMonth(), vietnam.getUTCDate()));
}

export async function readNurseServingDay(userId: string, requestedRoute: FeedingRoute = "NORMAL", now = new Date()) {
  const settings = await readOperationalSettings();
  const route: FeedingRoute = requestedRoute === "SONDE" && settings.sondeEnabled ? "SONDE" : "NORMAL";
  const memberships = await prisma.departmentMembership.findMany({ where: { userId, department: { status: "ACTIVE" } }, select: { departmentId: true, department: { select: { name: true } } } });
  const departmentId = requireNurseDepartment("NURSE", memberships.map((item) => item.departmentId));
  const day = hospitalDate(now);
  const events = await prisma.mealEvent.findMany({
    where: { mealDate: day, mealType: { feedingRoute: route } }, orderBy: { mealType: { sortOrder: "asc" } },
    include: { mealType: true, dietMeals: { where: { voidedAt: null, feedingRoute: route }, orderBy: { dietType: { sortOrder: "asc" } }, include: { dietType: true } }, reports: { where: { departmentId }, include: { lines: true } }, additions: { where: { departmentId, dietType: { feedingRoute: route } }, orderBy: { submittedAt: "desc" }, include: { dietType: true } }, mealHandoffs: { where: { departmentId }, take: 1, select: { quantity: true } }, deliveryReceipts: { where: { departmentId }, take: 1, include: { confirmedBy: { select: { displayName: true } } } } },
  });
  const demo = await readDemoSession();
  const demoDietTypes = demo ? new Map((await prisma.dietType.findMany({ where: { id: { in: demo.state.additions.map((item) => item.dietTypeId) } } })).map((item) => [item.id, item])) : new Map();
  if (demo) for (const event of events) {
    const report = demo.state.reports.find((item) => item.mealEventId === event.id && item.departmentId === departmentId);
    if (report) {
      const existing = event.reports.findIndex((item) => item.departmentId === departmentId);
      const projected = { id: `demo:${event.id}:${departmentId}`, departmentId, mealEventId: event.id, submittedById: userId, submittedAt: new Date(report.submittedAt), reportedByName: report.reportedByName, note: null, status: "SUBMITTED" as const, lines: report.lines.map((line, index) => ({ id: `demo-line:${index}`, servingReportId: `demo:${event.id}:${departmentId}`, ...line })) };
      if (existing >= 0) event.reports.splice(existing, 1, projected); else event.reports.push(projected);
    }
    const receipt = demo.state.receipts.find((item) => item.mealEventId === event.id && item.departmentId === departmentId);
    if (receipt) event.deliveryReceipts.splice(0, event.deliveryReceipts.length, { id: `demo-receipt:${event.id}:${departmentId}`, mealEventId: event.id, departmentId, status: receipt.status, expectedQuantity: receipt.expectedQuantity, receivedQuantity: receipt.receivedQuantity, note: receipt.note, confirmedAt: new Date(receipt.confirmedAt), updatedAt: new Date(receipt.confirmedAt), confirmedById: userId, confirmedBy: { displayName: receipt.confirmedBy } });
    const handoff = demo.state.handoffs.find((item) => item.mealEventId === event.id && item.departmentId === departmentId);
    if (handoff) event.mealHandoffs.splice(0, event.mealHandoffs.length, { quantity: handoff.quantity });
    for (const addition of demo.state.additions.filter((item) => item.mealEventId === event.id && item.departmentId === departmentId && item.feedingRoute === route)) { const dietType = demoDietTypes.get(addition.dietTypeId); if (dietType) event.additions.push({ id: addition.id, mealEventId: event.id, departmentId, dietTypeId: addition.dietTypeId, quantity: addition.quantity, reason: addition.reason, kind: addition.kind, ackStatus: addition.ackStatus, submittedAt: new Date(addition.submittedAt), submittedById: userId, ackById: null, ackAt: null, kitchenNote: addition.kitchenNote, dietType }); }
  }
  return { departmentId, departmentName: memberships[0]?.department.name ?? "—", events, route, sondeEnabled: settings.sondeEnabled, serviceCompletionMinutes: settings.serviceCompletionMinutes };
}

export async function saveServingReport(input: { mealEventId: string; departmentId: string; reportedByName: string; lines: ServingLineInput[] }, actor: { id: string; displayName: string; role: Role; demoSessionId?: string }, now = new Date()) {
  requireNurseDepartment(actor.role, [input.departmentId]);
  if (input.lines.length === 0) throw new Error("Bữa ăn chưa có chế độ để báo suất.");
  if (new Set(input.lines.map((line) => line.dietTypeId)).size !== input.lines.length) throw new Error("Có mã chế độ bị lặp.");
  aggregateHospitalServings(input.lines);
  const membership = await prisma.departmentMembership.findUnique({ where: { userId_departmentId: { userId: actor.id, departmentId: input.departmentId } }, select: { id: true } });
  if (!membership) throw new Error("Bạn không có quyền báo suất cho khoa này.");
  const event = await prisma.mealEvent.findUnique({ where: { id: input.mealEventId }, include: { mealType: true, dietMeals: { where: { voidedAt: null }, select: { id: true, dietTypeId: true, servingsPlanned: true } } } });
  if (!event) throw new Error("Không tìm thấy bữa ăn.");
  if (!isBeforeCutoff(event.mealDate, event.mealType.cutoffTime, now)) throw new Error("Đã qua giờ chốt. Số suất gốc không thể sửa.");
  const expected = new Set(event.dietMeals.map((meal) => meal.dietTypeId));
  if (input.lines.length !== expected.size || input.lines.some((line) => !expected.has(line.dietTypeId))) throw new Error("Danh sách chế độ không khớp với bữa ăn hiện tại.");
  if (actor.demoSessionId) {
    const reportedByName = normalizeReporterName(input.reportedByName);
    await updateDemoState((state) => { state.reports = state.reports.filter((item) => !(item.mealEventId === input.mealEventId && item.departmentId === input.departmentId)); state.reports.push({ mealEventId: input.mealEventId, departmentId: input.departmentId, reportedByName, submittedAt: now.toISOString(), lines: input.lines }); });
    return { id: `demo:${input.mealEventId}:${input.departmentId}` };
  }
  return prisma.$transaction(async (tx) => {
    const existing = await tx.servingReport.findUnique({ where: { departmentId_mealEventId: { departmentId: input.departmentId, mealEventId: input.mealEventId } }, include: { lines: true } });
    const reportedByName = normalizeReporterName(input.reportedByName);
    const report = await tx.servingReport.upsert({ where: { departmentId_mealEventId: { departmentId: input.departmentId, mealEventId: input.mealEventId } }, create: { departmentId: input.departmentId, mealEventId: input.mealEventId, submittedById: actor.id, submittedAt: now, reportedByName, status: "SUBMITTED" }, update: { submittedById: actor.id, submittedAt: now, reportedByName, status: "SUBMITTED" } });
    for (const line of input.lines) await tx.servingReportLine.upsert({ where: { servingReportId_dietTypeId: { servingReportId: report.id, dietTypeId: line.dietTypeId } }, create: { servingReportId: report.id, ...line }, update: { quantity: line.quantity, internalNote: line.internalNote, patientVisibleNote: line.patientVisibleNote } });
    await tx.auditLog.create({ data: { entityType: "ServingReport", entityId: report.id, action: existing ? "UPDATE" : "CREATE", actorId: actor.id, actorName: actor.displayName, beforeJson: existing ? buildServingSnapshot({ ...existing, lines: existing.lines }) as unknown as Prisma.InputJsonValue : undefined, afterJson: buildServingSnapshot({ ...report, lines: input.lines }) as unknown as Prisma.InputJsonValue, reason: `Điều dưỡng ${reportedByName} xác nhận báo suất` } });
    return report;
  }, { isolationLevel: "Serializable" });
}
