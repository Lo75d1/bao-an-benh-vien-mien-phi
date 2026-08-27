import type { ActiveStatus, FeedingRoute, Prisma, Role } from "@prisma/client";
import { normalizeEmail, validPassword } from "./auth";
import { hashPassword } from "./password";
import { prisma } from "./prisma";

export type AccountInput = { email: unknown; displayName: unknown; role: unknown; password?: unknown; departmentId?: unknown; kitchenRoute?: unknown };
const ROLES = new Set<Role>(["ADMIN", "DIETITIAN", "NURSE", "KITCHEN"]);

export function validateAccountInput(input: AccountInput, requirePassword: boolean) {
  const email = normalizeEmail(input.email);
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  const role = input.role as Role;
  const password = typeof input.password === "string" ? input.password : "";
  const departmentId = typeof input.departmentId === "string" && input.departmentId ? input.departmentId : null;
  const kitchenRoute = input.kitchenRoute === "SONDE" ? "SONDE" : input.kitchenRoute === "NORMAL" ? "NORMAL" : null;
  if (!email) throw new Error("Email không hợp lệ.");
  if (displayName.length < 2 || displayName.length > 100) throw new Error("Tên nhân viên phải có từ 2 đến 100 ký tự.");
  if (!ROLES.has(role)) throw new Error("Vai trò không hợp lệ.");
  if ((requirePassword || password) && !validPassword(password)) throw new Error("Mật khẩu phải có từ 10 đến 256 ký tự.");
  if (role === "NURSE" && !departmentId) throw new Error("Điều dưỡng phải được gán một khoa.");
  if (role === "KITCHEN" && !kitchenRoute) throw new Error("Tài khoản bếp phải chọn Ăn thường hoặc Sonde.");
  return { email, displayName, role, password: password || null, departmentId: role === "NURSE" ? departmentId : null, kitchenRoute: role === "KITCHEN" ? kitchenRoute as FeedingRoute : null };
}

async function requireAdmin(actor: { role: Role }) { if (actor.role !== "ADMIN") throw new Error("Chỉ quản trị viên được quản lý tài khoản."); }
const snapshot = (user: { email: string; displayName: string; role: Role; status: ActiveStatus; kitchenRoute?: FeedingRoute | null }, departmentId: string | null) => ({ ...user, departmentId });

export async function createAccount(input: AccountInput, actor: { id: string; displayName: string; role: Role }) {
  await requireAdmin(actor);
  const data = validateAccountInput(input, true);
  const passwordHash = hashPassword(data.password!);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email, displayName: data.displayName, role: data.role, kitchenRoute: data.kitchenRoute, passwordHash, memberships: data.departmentId ? { create: { departmentId: data.departmentId } } : undefined } });
    await tx.auditLog.create({ data: { entityType: "User", entityId: user.id, action: "CREATE", actorId: actor.id, actorName: actor.displayName, afterJson: snapshot(user, data.departmentId) as Prisma.InputJsonValue, reason: "Tạo tài khoản nhân viên" } });
    return user;
  });
}

export async function updateAccount(id: string, input: AccountInput, actor: { id: string; displayName: string; role: Role }) {
  await requireAdmin(actor);
  const data = validateAccountInput(input, false);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id }, include: { memberships: true } });
    if (!existing) throw new Error("Không tìm thấy tài khoản.");
    await tx.departmentMembership.deleteMany({ where: { userId: id } });
    const updated = await tx.user.update({ where: { id }, data: { email: data.email, displayName: data.displayName, role: data.role, kitchenRoute: data.kitchenRoute, ...(data.password ? { passwordHash: hashPassword(data.password), mustChangePassword: true } : {}), memberships: data.departmentId ? { create: { departmentId: data.departmentId } } : undefined } });
    await tx.auditLog.create({ data: { entityType: "User", entityId: id, action: "UPDATE", actorId: actor.id, actorName: actor.displayName, beforeJson: snapshot(existing, existing.memberships[0]?.departmentId ?? null) as Prisma.InputJsonValue, afterJson: snapshot(updated, data.departmentId) as Prisma.InputJsonValue, reason: "Cập nhật nhân sự và tài khoản" } });
    return updated;
  });
}

export async function setAccountStatus(id: string, status: ActiveStatus, reason: string, actor: { id: string; displayName: string; role: Role }) {
  await requireAdmin(actor);
  if (id === actor.id && status === "INACTIVE") throw new Error("Không thể tự vô hiệu hóa tài khoản đang đăng nhập.");
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 500) throw new Error("Lý do phải có từ 3 đến 500 ký tự.");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id } });
    if (!existing) throw new Error("Không tìm thấy tài khoản.");
    const updated = await tx.user.update({ where: { id }, data: { status } });
    if (status === "INACTIVE") await tx.session.deleteMany({ where: { userId: id } });
    await tx.auditLog.create({ data: { entityType: "User", entityId: id, action: status === "INACTIVE" ? "DEACTIVATE" : "REACTIVATE", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: existing.status }, afterJson: { status }, reason: cleanReason } });
    return updated;
  });
}
