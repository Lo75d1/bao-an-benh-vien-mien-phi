import type { Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";

export type ServingLineInput = { dietTypeId: string; quantity: number; internalNote: string | null; patientVisibleNote: string | null };
type ServingSnapshot = { status: "SUBMITTED"; departmentId: string; mealEventId: string; lines: ServingLineInput[] };

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

export function buildServingSnapshot(report: { departmentId: string; mealEventId: string; lines: ServingLineInput[] }): ServingSnapshot {
  return { status: "SUBMITTED", departmentId: report.departmentId, mealEventId: report.mealEventId, lines: report.lines.map((line) => ({ ...line })).sort((a, b) => a.dietTypeId.localeCompare(b.dietTypeId)) };
}

export function hospitalDate(now = new Date()): Date {
  const vietnam = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(vietnam.getUTCFullYear(), vietnam.getUTCMonth(), vietnam.getUTCDate()));
}

export async function readNurseServingDay(userId: string, now = new Date()) {
  const memberships = await prisma.departmentMembership.findMany({ where: { userId, department: { status: "ACTIVE" } }, select: { departmentId: true, department: { select: { name: true } } } });
  const departmentId = requireNurseDepartment("NURSE", memberships.map((item) => item.departmentId));
  const day = hospitalDate(now);
  const events = await prisma.mealEvent.findMany({
    where: { mealDate: day }, orderBy: { mealType: { sortOrder: "asc" } },
    include: { mealType: true, dietMeals: { where: { voidedAt: null }, orderBy: { dietType: { sortOrder: "asc" } }, include: { dietType: true } }, reports: { where: { departmentId }, include: { lines: true } } },
  });
  return { departmentId, departmentName: memberships[0]?.department.name ?? "—", events };
}

export async function upsertServingReport(input: { mealEventId: string; departmentId: string; lines: ServingLineInput[] }, actor: { id: string; displayName: string; role: Role }, now = new Date()) {
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
  return prisma.$transaction(async (tx) => {
    const existing = await tx.servingReport.findUnique({ where: { departmentId_mealEventId: { departmentId: input.departmentId, mealEventId: input.mealEventId } }, include: { lines: true } });
    const report = await tx.servingReport.upsert({ where: { departmentId_mealEventId: { departmentId: input.departmentId, mealEventId: input.mealEventId } }, create: { departmentId: input.departmentId, mealEventId: input.mealEventId, submittedById: actor.id, submittedAt: now, status: "SUBMITTED" }, update: { submittedById: actor.id, submittedAt: now, status: "SUBMITTED" } });
    for (const line of input.lines) await tx.servingReportLine.upsert({ where: { servingReportId_dietTypeId: { servingReportId: report.id, dietTypeId: line.dietTypeId } }, create: { servingReportId: report.id, ...line }, update: { quantity: line.quantity, internalNote: line.internalNote, patientVisibleNote: line.patientVisibleNote } });
    await tx.auditLog.create({ data: { entityType: "ServingReport", entityId: report.id, action: existing ? "UPDATE" : "CREATE", actorId: actor.id, actorName: actor.displayName, beforeJson: existing ? buildServingSnapshot({ ...existing, lines: existing.lines }) as unknown as Prisma.InputJsonValue : undefined, afterJson: buildServingSnapshot({ ...report, lines: input.lines }) as unknown as Prisma.InputJsonValue, reason: "Điều dưỡng báo suất trước giờ chốt" } });
    const submittedLines = await tx.servingReportLine.findMany({ where: { servingReport: { mealEventId: input.mealEventId, status: "SUBMITTED" } }, select: { dietTypeId: true, quantity: true } });
    const totals = aggregateHospitalServings(submittedLines);
    for (const meal of event.dietMeals) {
      const after = totals.get(meal.dietTypeId) ?? 0;
      if (after === meal.servingsPlanned) continue;
      await tx.dietMeal.update({ where: { id: meal.id }, data: { servingsPlanned: after } });
      await tx.auditLog.create({ data: { entityType: "DietMeal", entityId: meal.id, action: "MATERIALIZE_SERVINGS", actorId: actor.id, actorName: actor.displayName, beforeJson: { servingsPlanned: meal.servingsPlanned }, afterJson: { servingsPlanned: after }, reason: "Cộng lại báo suất toàn viện theo chế độ" } });
    }
    return report;
  }, { isolationLevel: "Serializable" });
}
