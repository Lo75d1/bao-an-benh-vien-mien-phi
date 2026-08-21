import { createHmac } from "node:crypto";
import type { PatientNoteStatus, Prisma, Role } from "@prisma/client";
import { evidenceStorage } from "./evidence-storage";
import { prisma } from "./prisma";
import { hospitalDate } from "./serving-report";

export const PATIENT_NOTE_LIMIT = 3;
export const PATIENT_NOTE_WINDOW_MS = 60 * 60 * 1000;

export function normalizePatientNote(value: unknown): string {
  if (typeof value !== "string") throw new Error("Ghi chú không hợp lệ.");
  const note = value.trim().replace(/\s+/g, " ");
  if (note.length < 3 || note.length > 500) throw new Error("Ghi chú cần từ 3 đến 500 ký tự.");
  return note;
}

export function normalizeContactName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return null;
  if (name.length > 100) throw new Error("Tên liên hệ tối đa 100 ký tự.");
  return name;
}

export function clientIpFromHeaders(forwarded: string | null, realIp: string | null): string | null {
  const candidate = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "";
  if (!candidate || candidate.length > 64 || !/^[0-9a-fA-F:.]+$/.test(candidate)) return null;
  return candidate.toLowerCase();
}

export function hashClientIp(ip: string, salt: string): string {
  if (salt.length < 16) throw new Error("Máy chủ chưa cấu hình khóa chống spam.");
  return createHmac("sha256", salt).update(ip).digest("base64url");
}

export function isPatientNoteRateLimited(createdAt: Date[], now = new Date()): boolean {
  const threshold = now.getTime() - PATIENT_NOTE_WINDOW_MS;
  return createdAt.filter((date) => date.getTime() >= threshold).length >= PATIENT_NOTE_LIMIT;
}

export function approvedNotesOnly<T extends { status: PatientNoteStatus; note: string }>(notes: T[]): Array<Pick<T, "note">> {
  return notes.filter((item) => item.status === "APPROVED").map((item) => ({ note: item.note }));
}

export function publicDietMeal<T extends { patientVisibleNote: string | null; internalNote?: string | null }>(meal: T) {
  return { patientVisibleNote: meal.patientVisibleNote };
}

export async function submitPatientNote(input: { token: string; note: unknown; contactName: unknown; ip: string | null }, now = new Date()) {
  const salt = process.env.PATIENT_NOTE_IP_SALT?.trim();
  if (!input.ip || !salt) throw new Error("Không thể xác minh yêu cầu chống spam lúc này.");
  const ipHash = hashClientIp(input.ip, salt);
  const note = normalizePatientNote(input.note);
  const contactName = normalizeContactName(input.contactName);
  const department = await prisma.department.findFirst({ where: { publicToken: input.token, status: "ACTIVE" }, select: { id: true } });
  if (!department) throw new Error("Mã khoa không hợp lệ hoặc đã ngừng hoạt động.");
  const since = new Date(now.getTime() - PATIENT_NOTE_WINDOW_MS);
  return prisma.$transaction(async (tx) => {
    const recent = await tx.patientNote.count({ where: { departmentId: department.id, ipHash, createdAt: { gte: since } } });
    if (recent >= PATIENT_NOTE_LIMIT) throw new Error("Bạn đã gửi quá nhiều ghi chú. Vui lòng thử lại sau.");
    return tx.patientNote.create({ data: { departmentId: department.id, mealDate: hospitalDate(now), note, contactName, ipHash, status: "RECEIVED" } });
  }, { isolationLevel: "Serializable" });
}

export async function readPendingPatientNotes(userId: string) {
  const memberships = await prisma.departmentMembership.findMany({ where: { userId, department: { status: "ACTIVE" } }, select: { departmentId: true } });
  const departmentIds = memberships.map((item) => item.departmentId);
  return prisma.patientNote.findMany({ where: { departmentId: { in: departmentIds }, status: "RECEIVED" }, orderBy: { createdAt: "asc" }, select: { id: true, note: true, contactName: true, mealDate: true, createdAt: true, department: { select: { name: true } } } });
}

export async function reviewPatientNote(input: { id: string; status: "APPROVED" | "REJECTED"; reviewNote: unknown }, actor: { id: string; displayName: string; role: Role }, now = new Date()) {
  if (actor.role !== "NURSE") throw new Error("Chỉ điều dưỡng được duyệt ghi chú bệnh nhân.");
  const reviewNote = normalizeContactName(input.reviewNote);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.patientNote.findFirst({ where: { id: input.id, status: "RECEIVED", department: { memberships: { some: { userId: actor.id } } } }, select: { id: true, status: true, departmentId: true } });
    if (!existing) throw new Error("Ghi chú không còn chờ duyệt hoặc không thuộc khoa của bạn.");
    const updated = await tx.patientNote.update({ where: { id: existing.id }, data: { status: input.status, reviewedById: actor.id, reviewedAt: now, reviewNote } });
    await tx.auditLog.create({ data: { entityType: "PatientNote", entityId: existing.id, action: input.status === "APPROVED" ? "APPROVE" : "REJECT", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: existing.status }, afterJson: { status: input.status } as Prisma.InputJsonValue, reason: reviewNote ?? (input.status === "APPROVED" ? "Điều dưỡng duyệt ghi chú" : "Điều dưỡng từ chối ghi chú") } });
    return updated;
  });
}

export async function readApprovedKitchenNotes() {
  return prisma.patientNote.findMany({ where: { status: "APPROVED" }, orderBy: { reviewedAt: "desc" }, take: 30, select: { id: true, note: true, mealDate: true, reviewedAt: true, department: { select: { name: true } } } });
}

type PublicEvaluation = { overall: "OK" | "WARN" | "FAIL" | "MISSING"; criteria: Array<{ key: string; label: string; status: string }> };
function publicEvaluation(value: unknown): PublicEvaluation {
  if (!value || typeof value !== "object") return { overall: "MISSING", criteria: [] };
  const raw = value as { overall?: unknown; criteria?: unknown };
  const overall = raw.overall === "OK" || raw.overall === "WARN" || raw.overall === "FAIL" ? raw.overall : "MISSING";
  const criteria = Array.isArray(raw.criteria) ? raw.criteria.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { key?: unknown; label?: unknown; status?: unknown };
    return typeof row.key === "string" && typeof row.label === "string" && typeof row.status === "string" ? [{ key: row.key, label: row.label, status: row.status }] : [];
  }) : [];
  return { overall, criteria };
}

function serviceAt(mealDate: Date, serviceTime: string): Date {
  const [hour = 0, minute = 0] = serviceTime.split(":").map(Number);
  return new Date(Date.UTC(mealDate.getUTCFullYear(), mealDate.getUTCMonth(), mealDate.getUTCDate(), hour - 7, minute));
}

export async function readPublicDepartment(token: string, now = new Date()) {
  const department = await prisma.department.findFirst({ where: { publicToken: token, status: "ACTIVE" }, select: { id: true, name: true } });
  if (!department) return null;
  const start = new Date(hospitalDate(now).getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(hospitalDate(now).getTime() + 3 * 24 * 60 * 60 * 1000);
  const events = await prisma.mealEvent.findMany({ where: { mealDate: { gte: start, lte: end }, reports: { some: { departmentId: department.id, status: "SUBMITTED" } } }, orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }], select: { id: true, mealDate: true, mealType: { select: { name: true, serviceTime: true } }, reports: { where: { departmentId: department.id, status: "SUBMITTED" }, select: { lines: { select: { dietTypeId: true, quantity: true, patientVisibleNote: true } } } }, dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, select: { id: true, dietTypeId: true, status: true, menuSnapshotJson: true, evaluationJson: true, patientVisibleNote: true, dietType: { select: { code: true, name: true } }, evidence: { where: { kind: "MEAL_PHOTO" }, orderBy: { uploadedAt: "desc" }, take: 1, select: { id: true, storagePath: true, note: true } } } } } });
  const shaped = events.map((event) => ({ ...event, at: serviceAt(event.mealDate, event.mealType.serviceTime), dietMeals: event.dietMeals.flatMap((meal) => { const line = event.reports[0]?.lines.find((item) => item.dietTypeId === meal.dietTypeId); if (!line || line.quantity <= 0) return []; const snapshot = meal.menuSnapshotJson as { items?: Array<{ itemName?: unknown }> } | null; return [{ id: meal.id, status: meal.status, dietType: meal.dietType, menuItems: Array.isArray(snapshot?.items) ? snapshot.items.flatMap((item) => typeof item.itemName === "string" ? [item.itemName] : []) : [], evaluation: publicEvaluation(meal.evaluationJson), patientVisibleNotes: [meal.patientVisibleNote, line.patientVisibleNote].filter((item): item is string => Boolean(item)), evidence: meal.evidence.map((item) => ({ id: item.id, note: item.note, publicUrl: evidenceStorage.publicUrl(item.storagePath) })) }]; }) }));
  const previous = shaped.filter((event) => event.at <= now).at(-1) ?? shaped[0] ?? null;
  const next = shaped.find((event) => previous && event.at > previous.at) ?? null;
  return { department: { name: department.name }, current: previous, next };
}
