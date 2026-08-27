import type { Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";

export function validateDepartmentInput(input: { code: unknown; name: unknown }) {
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!/^[A-Z0-9_-]{2,20}$/.test(code)) throw new Error("Mã khoa gồm 2-20 ký tự A-Z, số, gạch ngang hoặc gạch dưới.");
  if (name.length < 2 || name.length > 120) throw new Error("Tên khoa phải có từ 2 đến 120 ký tự.");
  return { code, name };
}

function requireAdmin(role: Role) {
  if (role !== "ADMIN") throw new Error("Chỉ quản trị viên được quản lý khoa điều trị.");
}

export async function saveDepartment(id: string | null, input: Parameters<typeof validateDepartmentInput>[0], actor: { id: string; displayName: string; role: Role }) {
  requireAdmin(actor.role);
  const data = validateDepartmentInput(input);
  return prisma.$transaction(async (tx) => {
    const before = id ? await tx.department.findUnique({ where: { id } }) : null;
    if (id && !before) throw new Error("Không tìm thấy khoa điều trị.");
    const row = id ? await tx.department.update({ where: { id }, data }) : await tx.department.create({ data });
    await tx.auditLog.create({ data: { entityType: "Department", entityId: row.id, action: id ? "UPDATE" : "CREATE", actorId: actor.id, actorName: actor.displayName, beforeJson: before as unknown as Prisma.InputJsonValue | undefined, afterJson: row as unknown as Prisma.InputJsonValue, reason: id ? "Cập nhật khoa điều trị" : "Tạo khoa điều trị" } });
    return row;
  });
}

export async function setDepartmentStatus(id: string, active: boolean, reason: string, actor: { id: string; displayName: string; role: Role }) {
  requireAdmin(actor.role);
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 500) throw new Error("Lý do phải có từ 3 đến 500 ký tự.");
  return prisma.$transaction(async (tx) => {
    const before = await tx.department.findUnique({ where: { id } });
    if (!before) throw new Error("Không tìm thấy khoa điều trị.");
    const row = await tx.department.update({ where: { id }, data: { status: active ? "ACTIVE" : "INACTIVE" } });
    await tx.auditLog.create({ data: { entityType: "Department", entityId: id, action: active ? "REACTIVATE" : "DEACTIVATE", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: before.status }, afterJson: { status: row.status }, reason: cleanReason } });
    return row;
  });
}
