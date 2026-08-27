import { cookies } from "next/headers";
import { getSessionUser, hashToken, SESSION_COOKIE } from "./auth";
import { hashPassword } from "./password";
import { PasswordChangeError, validatePasswordChange, type PasswordChangeInput } from "./profile-rules";
import { prisma } from "./prisma";

export async function changeOwnPassword(input: PasswordChangeInput) {
  const actor = await getSessionUser({ allowPasswordChange: true });
  if (!actor) throw new PasswordChangeError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new PasswordChangeError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  const currentTokenHash = hashToken(token);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: actor.id }, select: { passwordHash: true } });
    if (!user) throw new PasswordChangeError("Không tìm thấy tài khoản đang đăng nhập.");

    const newPassword = validatePasswordChange(input, user.passwordHash);
    await tx.user.update({ where: { id: actor.id }, data: { passwordHash: hashPassword(newPassword), mustChangePassword: false } });
    const revokedSessions = await tx.session.deleteMany({ where: { userId: actor.id, tokenHash: { not: currentTokenHash } } });
    await tx.auditLog.create({
      data: {
        entityType: "User",
        entityId: actor.id,
        action: "CHANGE_PASSWORD",
        actorId: actor.id,
        actorName: actor.displayName,
        afterJson: { revokedSessionCount: revokedSessions.count },
        reason: "Người dùng tự đổi mật khẩu",
      },
    });
  });
}
