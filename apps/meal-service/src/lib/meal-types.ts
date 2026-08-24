import type { FeedingRoute, Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateMealTypeInput(input: { code: unknown; name: unknown; cutoffTime: unknown; serviceTime: unknown; feedingRoute?: unknown; sortOrder: unknown }) {
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const cutoffTime = typeof input.cutoffTime === "string" ? input.cutoffTime : "";
  const serviceTime = typeof input.serviceTime === "string" ? input.serviceTime : "";
  const sortOrder = Number(input.sortOrder);
  const feedingRoute = input.feedingRoute === "SONDE" ? "SONDE" : "NORMAL" as FeedingRoute;
  if (!/^[A-Z0-9_-]{2,20}$/.test(code)) throw new Error("Mã bữa gồm 2-20 ký tự A-Z, số, gạch ngang hoặc gạch dưới.");
  if (name.length < 2 || name.length > 120) throw new Error("Tên bữa phải có từ 2 đến 120 ký tự.");
  if (!TIME.test(cutoffTime) || !TIME.test(serviceTime)) throw new Error("Giờ chốt và giờ phục vụ phải đúng dạng HH:mm.");
  if (cutoffTime >= serviceTime) throw new Error("Giờ chốt phải trước giờ phục vụ.");
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) throw new Error("Thứ tự phải là số nguyên từ 0 đến 999.");
  return { code, name, cutoffTime, serviceTime, feedingRoute, sortOrder };
}

function requireAdmin(role: Role) { if (role !== "ADMIN") throw new Error("Chỉ quản trị viên được quản lý bữa ăn."); }

export async function saveMealType(id: string | null, input: Parameters<typeof validateMealTypeInput>[0], actor: { id: string; displayName: string; role: Role }) {
  requireAdmin(actor.role);
  const data = validateMealTypeInput(input);
  return prisma.$transaction(async (tx) => {
    const before = id ? await tx.mealType.findUnique({ where: { id } }) : null;
    if (id && !before) throw new Error("Không tìm thấy bữa ăn.");
    const row = id ? await tx.mealType.update({ where: { id }, data }) : await tx.mealType.create({ data });
    await tx.auditLog.create({ data: { entityType: "MealType", entityId: row.id, action: id ? "UPDATE" : "CREATE", actorId: actor.id, actorName: actor.displayName, beforeJson: before as unknown as Prisma.InputJsonValue | undefined, afterJson: row as unknown as Prisma.InputJsonValue, reason: id ? "Cập nhật bữa ăn" : "Tạo bữa ăn" } });
    return row;
  });
}

export async function setMealTypeStatus(id: string, active: boolean, reason: string, actor: { id: string; displayName: string; role: Role }) {
  requireAdmin(actor.role);
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 500) throw new Error("Lý do phải có từ 3 đến 500 ký tự.");
  return prisma.$transaction(async (tx) => {
    const before = await tx.mealType.findUnique({ where: { id } });
    if (!before) throw new Error("Không tìm thấy bữa ăn.");
    const row = await tx.mealType.update({ where: { id }, data: { status: active ? "ACTIVE" : "INACTIVE" } });
    await tx.auditLog.create({ data: { entityType: "MealType", entityId: id, action: active ? "REACTIVATE" : "DEACTIVATE", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: before.status }, afterJson: { status: row.status }, reason: cleanReason } });
    return row;
  });
}
