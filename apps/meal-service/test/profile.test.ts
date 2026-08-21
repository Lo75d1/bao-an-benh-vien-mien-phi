import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword } from "../src/lib/password";
import { PasswordChangeError, validatePasswordChange } from "../src/lib/profile-rules";

const currentPassword = "mat-khau-hien-tai-123";
const currentPasswordHash = hashPassword(currentPassword);

test("đổi mật khẩu xác minh đúng mật khẩu hiện tại", () => {
  assert.throws(
    () => validatePasswordChange({ currentPassword: "mat-khau-sai-123", newPassword: "mat-khau-moi-456", confirmPassword: "mat-khau-moi-456" }, currentPasswordHash),
    PasswordChangeError,
  );
  assert.equal(validatePasswordChange({ currentPassword, newPassword: "mat-khau-moi-456", confirmPassword: "mat-khau-moi-456" }, currentPasswordHash), "mat-khau-moi-456");
});

test("mật khẩu mới hợp lệ và phải khác mật khẩu hiện tại", () => {
  assert.throws(() => validatePasswordChange({ currentPassword, newPassword: "ngan", confirmPassword: "ngan" }, currentPasswordHash), /10 đến 256/);
  assert.throws(() => validatePasswordChange({ currentPassword, newPassword: currentPassword, confirmPassword: currentPassword }, currentPasswordHash), /phải khác/);
});

test("xác nhận mật khẩu mới phải khớp", () => {
  assert.throws(
    () => validatePasswordChange({ currentPassword, newPassword: "mat-khau-moi-456", confirmPassword: "mat-khau-khac-789" }, currentPasswordHash),
    /không khớp/,
  );
});
