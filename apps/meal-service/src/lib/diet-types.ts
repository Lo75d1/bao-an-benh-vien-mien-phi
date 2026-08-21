import type { FeedingRoute, Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";

export function validateDietTypeInput(input: { code: unknown; name: unknown; feedingRoute: unknown; dietCodeRefId?: unknown; sortOrder?: unknown }) {
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const feedingRoute = input.feedingRoute as FeedingRoute;
  const sortOrder = Number(input.sortOrder);
  if (!/^[A-Z0-9_-]{2,20}$/.test(code)) throw new Error("Mã chế độ gồm 2-20 ký tự A-Z, số, gạch ngang hoặc gạch dưới.");
  if (name.length < 2 || name.length > 120) throw new Error("Tên chế độ phải có từ 2 đến 120 ký tự.");
  if (feedingRoute !== "NORMAL" && feedingRoute !== "SONDE") throw new Error("Đường nuôi không hợp lệ.");
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) throw new Error("Thứ tự phải là số nguyên từ 0 đến 999.");
  return { code, name, feedingRoute, dietCodeRefId: typeof input.dietCodeRefId === "string" && input.dietCodeRefId ? input.dietCodeRefId : null, sortOrder };
}

const requireEditor = (role: Role) => { if (role !== "ADMIN" && role !== "DIETITIAN") throw new Error("Bạn không có quyền sửa mã chế độ ăn."); };

export async function saveDietType(id: string | null, input: Parameters<typeof validateDietTypeInput>[0], actor: { id: string; displayName: string; role: Role }) {
  requireEditor(actor.role);
  const data = validateDietTypeInput(input);
  return prisma.$transaction(async (tx) => {
    const before = id ? await tx.dietType.findUnique({ where: { id } }) : null;
    if (id && !before) throw new Error("Không tìm thấy chế độ ăn.");
    const row = id ? await tx.dietType.update({ where: { id }, data }) : await tx.dietType.create({ data });
    await tx.auditLog.create({ data: { entityType: "DietType", entityId: row.id, action: id ? "UPDATE" : "CREATE", actorId: actor.id, actorName: actor.displayName, beforeJson: before as unknown as Prisma.InputJsonValue | undefined, afterJson: row as unknown as Prisma.InputJsonValue, reason: id ? "Cập nhật mã chế độ và quy định" : "Tạo mã chế độ và quy định" } });
    return row;
  });
}

export async function setDietTypeStatus(id: string, active: boolean, reason: string, actor: { id: string; displayName: string; role: Role }) {
  requireEditor(actor.role);
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 500) throw new Error("Lý do phải có từ 3 đến 500 ký tự.");
  return prisma.$transaction(async (tx) => {
    const before = await tx.dietType.findUnique({ where: { id } });
    if (!before) throw new Error("Không tìm thấy chế độ ăn.");
    const row = await tx.dietType.update({ where: { id }, data: { status: active ? "ACTIVE" : "INACTIVE" } });
    await tx.auditLog.create({ data: { entityType: "DietType", entityId: id, action: active ? "REACTIVATE" : "DEACTIVATE", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: before.status }, afterJson: { status: row.status }, reason: cleanReason } });
    return row;
  });
}
