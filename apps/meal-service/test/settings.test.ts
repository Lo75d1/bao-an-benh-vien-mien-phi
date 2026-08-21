import assert from "node:assert/strict";
import test from "node:test";
import { canApproveWarehouse, entryWindowEnd, parseOperationalSettings, routeVisible, validateMealTimes, validateOperationalSettings } from "../src/lib/settings";
import { validateAccountInput } from "../src/lib/accounts";
import { hashPassword, verifyPassword } from "../src/lib/password";

test("setting giờ chốt chỉ nhận HH:mm hợp lệ", () => {
  assert.deepEqual(validateMealTimes([{ id: "breakfast", cutoffTime: "05:30", serviceTime: "06:30" }])[0].cutoffTime, "05:30");
  assert.throws(() => validateMealTimes([{ id: "breakfast", cutoffTime: "25:00", serviceTime: "06:30" }]));
});

test("sonde toggle ẩn đường nuôi sonde nhưng giữ ăn thường", () => {
  assert.equal(routeVisible("NORMAL", false), true);
  assert.equal(routeVisible("SONDE", false), false);
  assert.equal(routeVisible("SONDE", true), true);
});

test("Mode kho và role duyệt được parse và có hiệu lực", () => {
  const settings = parseOperationalSettings({ advanceEntryDays: 14, sondeEnabled: false, warehouseMode: "B", warehouseApprovalRole: "KITCHEN" });
  assert.equal(settings.warehouseMode, "B");
  assert.equal(canApproveWarehouse("KITCHEN", settings.warehouseApprovalRole), true);
  assert.equal(canApproveWarehouse("DIETITIAN", settings.warehouseApprovalRole), false);
  assert.equal(canApproveWarehouse("ADMIN", settings.warehouseApprovalRole), true);
  assert.throws(() => validateOperationalSettings({ ...settings, advanceEntryDays: 0 }));
});

test("số ngày nhập trước giới hạn cửa sổ nhập liệu", () => {
  assert.equal(entryWindowEnd(new Date("2026-08-21T00:00:00.000Z"), 7).toISOString(), "2026-08-28T23:59:59.999Z");
});

test("account validation bắt buộc khoa cho điều dưỡng", () => {
  assert.throws(() => validateAccountInput({ email: "nurse@example.org", displayName: "Điều dưỡng A", role: "NURSE", password: "mat-khau-123" }, true));
  const account = validateAccountInput({ email: "NURSE@example.org", displayName: "Điều dưỡng A", role: "NURSE", password: "mat-khau-123", departmentId: "dept-1" }, true);
  assert.equal(account.email, "nurse@example.org");
});

test("mật khẩu lưu bằng scrypt, không chứa plaintext", () => {
  const password = "mat-khau-rat-dai-123";
  const encoded = hashPassword(password);
  assert.match(encoded, /^scrypt\$/);
  assert.equal(encoded.includes(password), false);
  assert.equal(verifyPassword(password, encoded), true);
  assert.equal(verifyPassword("sai-mat-khau", encoded), false);
});
