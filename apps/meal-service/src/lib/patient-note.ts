import { createHmac } from "node:crypto";
import { Prisma, type PatientNoteStatus, type PatientSubmissionStatus, type PatientSubmissionType, type Role } from "@prisma/client";
import { evidenceStorage } from "./evidence-storage";
import { prisma } from "./prisma";
import { hospitalDate } from "./serving-report";
import { readOperationalSettings } from "./settings";
import { parseMenuItems } from "./menu-logic";

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

export function normalizeContactInfo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const contact = value.trim().replace(/\s+/g, " ");
  if (!contact) return null;
  if (contact.length > 120) throw new Error("Thông tin liên hệ tối đa 120 ký tự.");
  return contact;
}

export function normalizeSubmissionType(value: unknown): PatientSubmissionType {
  return value === "FEEDBACK" ? "FEEDBACK" : "MEAL_NOTE";
}

export function clientIpFromHeaders(forwarded: string | null, realIp: string | null): string | null {
  // Reverse proxy của hệ thống ghi x-real-ip; chỉ dùng X-Forwarded-For làm phương án dự phòng.
  const candidate = realIp?.trim() || forwarded?.split(",")[0]?.trim() || "";
  if (!candidate || candidate.length > 64 || !/^[0-9a-fA-F:.]+$/.test(candidate)) return null;
  return candidate.toLowerCase();
}

export function hashClientIp(ip: string, salt: string): string {
  if (salt.length < 16) throw new Error("Máy chủ chưa cấu hình khóa chống spam.");
  return createHmac("sha256", salt).update(ip).digest("base64url");
}

export function patientSubmissionSpamHash(ip: string | null, salt: string | undefined | null): string | null {
  const cleanSalt = salt?.trim();
  if (!ip || !cleanSalt) return null;
  return hashClientIp(ip, cleanSalt);
}

export function isPatientNoteRateLimited(createdAt: Date[], now = new Date()): boolean {
  const threshold = now.getTime() - PATIENT_NOTE_WINDOW_MS;
  return createdAt.filter((date) => date.getTime() >= threshold).length >= PATIENT_NOTE_LIMIT;
}

export function approvedNotesOnly<T extends { status: PatientNoteStatus; note: string }>(notes: T[]): Array<Pick<T, "note">> {
  return notes.filter((item) => item.status === "APPROVED").map((item) => ({ note: item.note }));
}

export function kitchenForwardedNotesOnly<T extends { submissionStatus?: PatientSubmissionStatus | null; status?: PatientNoteStatus; note: string }>(notes: T[]): Array<Pick<T, "note">> {
  return notes.filter((item) => item.submissionStatus === "FORWARDED_TO_KITCHEN" || item.status === "APPROVED").map((item) => ({ note: item.note }));
}

export function publicDietMeal<T extends { patientVisibleNote: string | null; internalNote?: string | null }>(meal: T) {
  return { patientVisibleNote: meal.patientVisibleNote };
}

export type PublicPatientNote = { source: "DIETITIAN" | "DEPARTMENT"; text: string };

export function publicPatientNotes(dietitianNote: string | null, departmentNote: string | null): PublicPatientNote[] {
  const notes: PublicPatientNote[] = [];
  const dietitianText = dietitianNote?.trim();
  const departmentText = departmentNote?.trim();
  if (dietitianText) notes.push({ source: "DIETITIAN", text: dietitianText });
  if (departmentText && departmentText !== dietitianText) notes.push({ source: "DEPARTMENT", text: departmentText });
  return notes;
}

export async function submitPatientSubmission(input: { token: string; type: unknown; note: unknown; contactName: unknown; contactInfo?: unknown; mealDate?: unknown; mealEventId?: unknown; ip: string | null }, now = new Date()) {
  const ipHash = patientSubmissionSpamHash(input.ip, process.env.PATIENT_NOTE_IP_SALT);
  const type = normalizeSubmissionType(input.type);
  const note = normalizePatientNote(input.note);
  const contactName = normalizeContactName(input.contactName);
  const contactInfo = normalizeContactInfo(input.contactInfo);
  const department = await prisma.department.findFirst({ where: { publicToken: input.token, status: "ACTIVE" }, select: { id: true } });
  if (!department) throw new Error("Mã khoa không hợp lệ hoặc đã ngừng hoạt động.");
  const mealEventId = typeof input.mealEventId === "string" && input.mealEventId.trim() ? input.mealEventId.trim() : null;
  const requestedDate = typeof input.mealDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.mealDate) ? new Date(`${input.mealDate}T00:00:00.000Z`) : null;
  const since = new Date(now.getTime() - PATIENT_NOTE_WINDOW_MS);
  return prisma.$transaction(async (tx) => {
    if (ipHash) {
      const recent = await tx.patientNote.count({ where: { departmentId: department.id, ipHash, createdAt: { gte: since } } });
      if (recent >= PATIENT_NOTE_LIMIT) throw new Error("Ban da gui qua nhieu noi dung. Vui long thu lai sau.");
    }
    const mealEvent = mealEventId ? await tx.mealEvent.findUnique({ where: { id: mealEventId }, select: { id: true, mealDate: true } }) : null;
    if (mealEventId && !mealEvent) throw new Error("Bữa liên quan không hợp lệ.");
    return tx.patientNote.create({ data: { departmentId: department.id, mealEventId: mealEvent?.id ?? null, mealDate: mealEvent?.mealDate ?? requestedDate ?? hospitalDate(now), type, note, contactName, contactInfo, ipHash, status: "RECEIVED", submissionStatus: "NEW" } });
  }, { isolationLevel: "Serializable" });
}

export async function submitPatientNote(input: { token: string; note: unknown; contactName: unknown; ip: string | null }, now = new Date()) {
  return submitPatientSubmission({ ...input, type: "MEAL_NOTE" }, now);
}

export async function readPendingPatientNotes(userId: string) {
  const memberships = await prisma.departmentMembership.findMany({ where: { userId, department: { status: "ACTIVE" } }, select: { departmentId: true } });
  const departmentIds = memberships.map((item) => item.departmentId);
  return prisma.patientNote.findMany({ where: { departmentId: { in: departmentIds }, type: "MEAL_NOTE", submissionStatus: { in: ["NEW", "IN_PROGRESS"] } }, orderBy: { createdAt: "asc" }, select: { id: true, type: true, submissionStatus: true, note: true, contactName: true, contactInfo: true, mealDate: true, createdAt: true, department: { select: { name: true } } } });
}

export async function reviewPatientNote(input: { id: string; status: "APPROVED" | "REJECTED"; reviewNote: unknown }, actor: { id: string; displayName: string; role: Role }, now = new Date()) {
  if (actor.role !== "NURSE" && actor.role !== "ADMIN") throw new Error("Chỉ khoa điều trị hoặc quản trị viên được duyệt ghi chú bệnh nhân.");
  const reviewNote = normalizeContactName(input.reviewNote);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.patientNote.findFirst({ where: { id: input.id, type: "MEAL_NOTE", submissionStatus: { in: ["NEW", "IN_PROGRESS"] }, ...(actor.role === "NURSE" ? { department: { memberships: { some: { userId: actor.id } } } } : {}) }, select: { id: true, status: true, submissionStatus: true, departmentId: true } });
    if (!existing) throw new Error("Ghi chú không còn chờ duyệt hoặc không thuộc khoa của bạn.");
    const nextStatus = input.status === "APPROVED" ? "FORWARDED_TO_KITCHEN" : "REJECTED";
    const updated = await tx.patientNote.update({ where: { id: existing.id }, data: { status: input.status, submissionStatus: nextStatus, reviewedById: actor.id, reviewedAt: now, reviewNote, forwardedToKitchenAt: input.status === "APPROVED" ? now : null, forwardedById: input.status === "APPROVED" ? actor.id : null } });
    await tx.auditLog.create({ data: { entityType: "PatientNote", entityId: existing.id, action: input.status === "APPROVED" ? "FORWARD_TO_KITCHEN" : "REJECT", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: existing.status, submissionStatus: existing.submissionStatus }, afterJson: { status: input.status, submissionStatus: nextStatus } as Prisma.InputJsonValue, reason: reviewNote ?? (input.status === "APPROVED" ? "Khoa/Admin kiểm tra và chuyển ghi chú tới bếp" : "Khoa/Admin từ chối ghi chú") } });
    return updated;
  });
}

export async function readApprovedKitchenNotes() {
  const notes = await prisma.patientNote.findMany({ where: { type: "MEAL_NOTE", submissionStatus: "FORWARDED_TO_KITCHEN" }, orderBy: [{ forwardedToKitchenAt: "desc" }, { reviewedAt: "desc" }], take: 30, select: { id: true, note: true, mealDate: true, reviewedAt: true, forwardedToKitchenAt: true, department: { select: { name: true } } } });
  const read = await prisma.auditLog.findMany({ where: { entityType: "PatientNote", entityId: { in: notes.map((note) => note.id) }, action: "KITCHEN_READ" }, select: { entityId: true } });
  const readIds = new Set(read.map((item) => item.entityId));
  return notes.map((note) => ({ ...note, acknowledged: readIds.has(note.id) }));
}

export async function readPatientSubmissions(input: { type?: PatientSubmissionType | "ALL"; status?: PatientSubmissionStatus | "ALL"; departmentId?: string; limit?: number } = {}) {
  return prisma.patientNote.findMany({
    where: {
      ...(input.type && input.type !== "ALL" ? { type: input.type } : {}),
      ...(input.status && input.status !== "ALL" ? { submissionStatus: input.status } : {}),
      ...(input.departmentId ? { departmentId: input.departmentId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 100,
    select: { id: true, type: true, submissionStatus: true, note: true, contactName: true, contactInfo: true, mealDate: true, createdAt: true, reviewedAt: true, reviewNote: true, forwardedToKitchenAt: true, resolvedAt: true, department: { select: { id: true, name: true } }, mealEvent: { select: { id: true, mealType: { select: { name: true } } } }, reviewedBy: { select: { displayName: true } }, forwardedBy: { select: { displayName: true } }, resolvedBy: { select: { displayName: true } } },
  });
}

export async function transitionPatientSubmission(input: { id: string; action: "ACCEPT" | "IN_PROGRESS" | "FORWARD_TO_KITCHEN" | "RESOLVE" | "REJECT"; note?: unknown }, actor: { id: string; displayName: string; role: Role }, now = new Date()) {
  if (actor.role !== "ADMIN" && actor.role !== "NURSE" && actor.role !== "DIETITIAN") throw new Error("Bạn không có quyền xử lý ghi chú/phản ánh.");
  const reviewNote = normalizeContactName(input.note);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.patientNote.findUnique({ where: { id: input.id }, select: { id: true, type: true, submissionStatus: true, departmentId: true, status: true } });
    if (!existing) throw new Error("Không tìm thấy ghi chú/phản ánh.");
    if (actor.role === "NURSE") {
      const member = await tx.departmentMembership.findFirst({ where: { userId: actor.id, departmentId: existing.departmentId }, select: { id: true } });
      if (!member) throw new Error("Bạn không có quyền xử lý nội dung của khoa này.");
    }
    let nextStatus: PatientSubmissionStatus = existing.submissionStatus;
    const data: Prisma.PatientNoteUpdateInput = { reviewNote };
    if (input.action === "ACCEPT" || input.action === "IN_PROGRESS") nextStatus = "IN_PROGRESS";
    if (input.action === "REJECT") nextStatus = "REJECTED";
    if (input.action === "RESOLVE") nextStatus = "RESOLVED";
    if (input.action === "FORWARD_TO_KITCHEN") {
      if (existing.type !== "MEAL_NOTE") throw new Error("Chỉ ghi chú bữa ăn mới được chuyển bếp.");
      nextStatus = "FORWARDED_TO_KITCHEN";
      data.status = "APPROVED";
      data.reviewedBy = { connect: { id: actor.id } };
      data.reviewedAt = now;
      data.forwardedBy = { connect: { id: actor.id } };
      data.forwardedToKitchenAt = now;
    }
    if (input.action === "REJECT") data.status = "REJECTED";
    if (input.action === "RESOLVE") {
      data.resolvedBy = { connect: { id: actor.id } };
      data.resolvedAt = now;
    }
    data.submissionStatus = nextStatus;
    const updated = await tx.patientNote.update({ where: { id: existing.id }, data });
    await tx.auditLog.create({ data: { entityType: "PatientNote", entityId: existing.id, action: `PATIENT_SUBMISSION_${input.action}`, actorId: actor.id, actorName: actor.displayName, beforeJson: { type: existing.type, submissionStatus: existing.submissionStatus }, afterJson: { type: existing.type, submissionStatus: nextStatus } as Prisma.InputJsonValue, reason: reviewNote ?? "Cập nhật trạng thái ghi chú/phản ánh" } });
    return updated;
  });
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

export function selectPublicMealWindow<T extends { at: Date }>(meals: T[], now = new Date()): { current: T | null; next: T | null } {
  return { current: meals.filter((meal) => meal.at <= now).at(-1) ?? null, next: meals.find((meal) => meal.at > now) ?? null };
}

export async function readPublicDepartment(token: string, selectedDate?: string, now = new Date()) {
  const [department, settings] = await Promise.all([prisma.department.findFirst({ where: { publicToken: token, status: "ACTIVE" }, select: { id: true, name: true } }), readOperationalSettings()]);
  if (!department) return null;
  const start = hospitalDate(now);
  const end = new Date(start.getTime() + settings.advanceEntryDays * 24 * 60 * 60 * 1000);
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate ?? "") ? new Date(`${selectedDate}T00:00:00.000Z`) : start;
  const selected = Number.isFinite(requested.getTime()) && requested >= start && requested <= end ? requested : start;
  const events = await prisma.mealEvent.findMany({ where: { mealDate: { gte: start, lte: end }, reports: { some: { departmentId: department.id, status: "SUBMITTED" } } }, orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }], select: { id: true, mealDate: true, mealType: { select: { name: true, serviceTime: true } }, reports: { where: { departmentId: department.id, status: "SUBMITTED" }, select: { lines: { select: { dietTypeId: true, quantity: true, patientVisibleNote: true } } } }, dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, select: { id: true, dietTypeId: true, status: true, menuSnapshotJson: true, evaluationJson: true, patientVisibleNote: true, dietType: { select: { code: true, name: true } }, evidence: { where: { kind: "MEAL_PHOTO" }, orderBy: { uploadedAt: "desc" }, take: 1, select: { id: true, storagePath: true, note: true } } } } } });
  const shaped = events.map((event) => ({ ...event, at: serviceAt(event.mealDate, event.mealType.serviceTime), dietMeals: event.dietMeals.flatMap((meal) => { const line = event.reports[0]?.lines.find((item) => item.dietTypeId === meal.dietTypeId); if (!line || line.quantity <= 0) return []; const snapshot = meal.menuSnapshotJson as { items?: Array<{ itemName?: unknown }> } | null; const publicMeal = publicDietMeal(meal); return [{ id: meal.id, status: meal.status, dietType: meal.dietType, menuItems: Array.isArray(snapshot?.items) ? snapshot.items.flatMap((item) => typeof item.itemName === "string" ? [item.itemName] : []) : [], evaluation: publicEvaluation(meal.evaluationJson), patientVisibleNotes: publicPatientNotes(publicMeal.patientVisibleNote, line.patientVisibleNote), evidence: meal.evidence.map((item) => ({ id: item.id, note: item.note, publicUrl: evidenceStorage.publicUrl(item.storagePath) })) }]; }) }));
  const { current: previous, next } = selectPublicMealWindow(shaped, now);
  const selectedKey = selected.toISOString().slice(0, 10);
  return { department: { name: department.name }, current: previous, next, selectedEvents: shaped.filter((event) => event.mealDate.toISOString().slice(0, 10) === selectedKey), selectedDate: selectedKey, minDate: start.toISOString().slice(0, 10), maxDate: end.toISOString().slice(0, 10), advanceEntryDays: settings.advanceEntryDays, showImages: settings.publicMenuImages };
}

export async function readPublicDietMenu(dietCode?: string, selectedDate?: string, now = new Date()) {
  const settings = await readOperationalSettings();
  const [diets, departments] = await Promise.all([
    prisma.dietType.findMany({ where: { status: "ACTIVE", ...(settings.sondeEnabled ? {} : { feedingRoute: "NORMAL" }) }, orderBy: { sortOrder: "asc" }, select: { id: true, code: true, name: true, feedingRoute: true } }),
    prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, publicToken: true } }),
  ]);
  const selectedDiet = diets.find((diet) => diet.code === dietCode) ?? diets[0] ?? null;
  const start = hospitalDate(now);
  const end = new Date(start.getTime() + settings.advanceEntryDays * 24 * 60 * 60 * 1000);
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate ?? "") ? new Date(`${selectedDate}T00:00:00.000Z`) : start;
  const selected = Number.isFinite(requested.getTime()) && requested >= start && requested <= end ? requested : start;
  const timelineMeals = selectedDiet ? await prisma.dietMeal.findMany({ where: { dietTypeId: selectedDiet.id, voidedAt: null, menuSnapshotJson: { not: Prisma.DbNull }, mealEvent: { mealDate: { gte: start, lte: end } } }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { mealEvent: { mealType: { sortOrder: "asc" } } }], select: { id: true, status: true, menuSnapshotJson: true, patientVisibleNote: true, mealEvent: { select: { mealDate: true, mealType: { select: { name: true, serviceTime: true } } } }, evidence: { where: { kind: "MEAL_PHOTO" }, orderBy: { uploadedAt: "desc" }, take: 1, select: { id: true, storagePath: true, note: true } } } }) : [];
  const shapedMeals = timelineMeals.map((meal) => { const items = parseMenuItems(meal.menuSnapshotJson); const publicMeal = publicDietMeal(meal); return { id: meal.id, status: meal.status, mealDate: meal.mealEvent.mealDate, at: serviceAt(meal.mealEvent.mealDate, meal.mealEvent.mealType.serviceTime), mealType: meal.mealEvent.mealType, dishes: [...new Set(items.map((item) => item.dishName))], ingredients: items.map((item) => ({ dishName: item.dishName, name: item.itemName.split(" (")[0].trim() || item.itemName, grams: Number.isFinite(item.grams) && item.grams > 0 ? item.grams : null })), patientVisibleNote: publicMeal.patientVisibleNote, evidence: settings.publicMenuImages ? meal.evidence.map((item) => ({ id: item.id, note: item.note, publicUrl: evidenceStorage.publicUrl(item.storagePath) })) : [] }; });
  const selectedKey = selected.toISOString().slice(0, 10);
  const mealWindow = selectPublicMealWindow(shapedMeals, now);
  return { diets, departments: departments.map((department) => ({ id: department.id, name: department.name, token: department.publicToken })), selectedDiet, selectedDate: selectedKey, minDate: start.toISOString().slice(0, 10), maxDate: end.toISOString().slice(0, 10), advanceEntryDays: settings.advanceEntryDays, showImages: settings.publicMenuImages, showViewCount: settings.publicViewCountVisible, currentMeal: mealWindow.current, nextMeal: mealWindow.next, meals: shapedMeals.filter((meal) => meal.mealDate.toISOString().slice(0, 10) === selectedKey) };
}
