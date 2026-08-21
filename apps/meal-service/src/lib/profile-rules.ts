import { validPassword } from "./auth";
import { verifyPassword } from "./password";

export class PasswordChangeError extends Error {}

export type PasswordChangeInput = {
  currentPassword: unknown;
  newPassword: unknown;
  confirmPassword: unknown;
};

export function validatePasswordChange(input: PasswordChangeInput, currentPasswordHash: string) {
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (currentPassword.length === 0 || currentPassword.length > 256 || !verifyPassword(currentPassword, currentPasswordHash)) {
    throw new PasswordChangeError("Mật khẩu hiện tại không đúng.");
  }
  if (!validPassword(newPassword)) {
    throw new PasswordChangeError("Mật khẩu mới phải có từ 10 đến 256 ký tự.");
  }
  if (newPassword === currentPassword) {
    throw new PasswordChangeError("Mật khẩu mới phải khác mật khẩu hiện tại.");
  }
  if (newPassword !== confirmPassword) {
    throw new PasswordChangeError("Xác nhận mật khẩu mới không khớp.");
  }

  return newPassword;
}
