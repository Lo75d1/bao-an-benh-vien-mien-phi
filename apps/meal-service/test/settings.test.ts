import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicPatientUrl, canApproveWarehouse, entryWindowEnd, parseOperationalSettings, routeVisible, validateMealTimes, validateOperationalSettings, validatePublicBaseUrl, visibleOperationalItems } from "../src/lib/settings";
import { validateAccountInput } from "../src/lib/accounts";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { validateMealTypeInput } from "../src/lib/meal-types";
import { blendHex, contrastRatio, contrastSafeText, parseBrandingSettings, publicThemeTokens, readableForeground, validateBrandingSettings } from "../src/lib/branding";

test("nhận diện bệnh viện giữ giá trị hợp lệ và tự chọn màu chữ tương phản", () => {
  const branding = parseBrandingSettings({ organizationName: "Bệnh viện An Bình", shortName: "AB", primaryColor: "#F3E8C8" });
  assert.equal(branding.organizationName, "Bệnh viện An Bình");
  assert.equal(branding.primaryColor, "#F3E8C8");
  assert.equal(branding.publicPrimaryColor, "#153B5B");
  assert.equal(branding.publicAccentColor, "#2F80B7");
  assert.equal(branding.publicHeroEnabled, true);
  assert.equal(readableForeground(branding.primaryColor), "#17241F");
  assert.equal(readableForeground("#123C36"), "#FFFFFF");
  assert.equal(blendHex("#123C36", "#FFFFFF", .9), "#E7ECEB");
  assert.throws(() => validateBrandingSettings({ ...branding, primaryColor: "red" }));
});

test("nhận diện mặc định ưu tiên nền sáng", () => {
  const branding = parseBrandingSettings(null);
  assert.equal(branding.primaryColor, "#DDF1EA");
  assert.equal(branding.publicHeroImageDataUrl, null);
  assert.equal(readableForeground(branding.primaryColor), "#17241F");
});

test("cấu hình lượt xem mặc định hiển thị và đọc được trạng thái tắt", () => {
  assert.equal(parseOperationalSettings(null).publicViewCountVisible, true);
  assert.equal(parseOperationalSettings({ publicViewCountVisible: false }).publicViewCountVisible, false);
});

test("địa chỉ trang công khai được chuẩn hóa và kiểm tra hợp lệ", () => {
  assert.equal(parseOperationalSettings(null).publicBaseUrl, "");
  assert.equal(validatePublicBaseUrl(" https://benhvien.example.vn/ "), "https://benhvien.example.vn");
  assert.equal(validatePublicBaseUrl("http://localhost:3000"), "http://localhost:3000");
  assert.throws(() => validatePublicBaseUrl("javascript:alert(1)"));
  assert.throws(() => validatePublicBaseUrl("not-a-url"));
});

test("địa chỉ QR công khai sinh từ base URL đã cấu hình", () => {
  assert.equal(buildPublicPatientUrl("https://benhvien.example.vn", "dept-1"), "https://benhvien.example.vn/k/dept-1");
  assert.equal(buildPublicPatientUrl("https://benhvien.example.vn/khoa/noi", "dept 1"), "https://benhvien.example.vn/khoa/noi/k/dept%201");
  assert.equal(buildPublicPatientUrl("", "dept-1"), null);
  assert.equal(buildPublicPatientUrl("   ", "dept-1"), null);
  assert.equal(buildPublicPatientUrl("javascript:alert(1)", "dept-1"), null);
  assert.equal(buildPublicPatientUrl("https://benhvien.example.vn", "dept-1")?.startsWith("https://benhvien.example.vn/"), true);
});

test("setting giờ chốt chỉ nhận HH:mm hợp lệ", () => {
  assert.deepEqual(validateMealTimes([]), []);
  assert.deepEqual(validateMealTimes([{ id: "breakfast", cutoffTime: "05:30", serviceTime: "06:30" }])[0].cutoffTime, "05:30");
  assert.throws(() => validateMealTimes([{ id: "breakfast", cutoffTime: "25:00", serviceTime: "06:30" }]));
});

test("bữa ăn bắt buộc giờ chốt trước giờ phục vụ", () => {
  const meal = validateMealTypeInput({ code: "phu_chieu", name: "Phụ chiều", cutoffTime: "14:30", serviceTime: "15:30", sortOrder: 25 });
  assert.equal(meal.code, "PHU_CHIEU");
  assert.throws(() => validateMealTypeInput({ ...meal, cutoffTime: "16:00" }));
  assert.throws(() => validateMealTypeInput({ ...meal, cutoffTime: "25:00" }));
});

test("sonde toggle ẩn đường nuôi sonde nhưng giữ ăn thường", () => {
  assert.equal(routeVisible("NORMAL", false), true);
  assert.equal(routeVisible("SONDE", false), false);
  assert.equal(routeVisible("SONDE", true), true);
});

test("Mode kho và vai trò xác nhận được parse và có hiệu lực", () => {
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

test("admin kiểm soát thời gian chuyển sang bữa kế", () => {
  const settings = parseOperationalSettings({ serviceCompletionMinutes: 90 });
  assert.equal(settings.serviceCompletionMinutes, 90);
  assert.throws(() => validateOperationalSettings({ ...settings, serviceCompletionMinutes: 10 }));
});

test("mẫu lưu 24 giờ là tùy chọn do admin bật", () => {
  assert.equal(parseOperationalSettings(null).foodRetention24hRequired, false);
  assert.equal(parseOperationalSettings({ foodRetention24hRequired: true }).foodRetention24hRequired, true);
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

test("lọc cữ vận hành theo cấu hình Sonde mà không xóa dữ liệu nguồn", () => {
  const slots = [{ id: "sang", feedingRoute: "NORMAL" as const }, { id: "sonde-03", feedingRoute: "SONDE" as const }];
  assert.deepEqual(visibleOperationalItems(slots, false).map((item) => item.id), ["sang"]);
  assert.deepEqual(visibleOperationalItems(slots, true).map((item) => item.id), ["sang", "sonde-03"]);
  assert.equal(slots.length, 2);
});

test("cấu hình public menu mặc định chỉ hiện món, không bung thành phần", () => {
  const defaults = parseOperationalSettings(null);
  assert.equal(defaults.publicMenuDishes, true);
  assert.equal(defaults.publicMenuIngredients, false);
  const hidden = parseOperationalSettings({ publicMenuDishes: false, publicMenuIngredients: true });
  assert.equal(hidden.publicMenuDishes, false);
  assert.equal(hidden.publicMenuIngredients, true);
});

test("token trang công khai giữ tương phản chữ trên màu sáng và tối", () => {
  assert.ok(contrastRatio(contrastSafeText("#F2C94C"), "#F8FBFD") >= 4.5);
  const light = publicThemeTokens("#E3F0FA", "#F2C94C");
  assert.equal(light.primaryForeground, "#17241F");
  assert.ok(contrastRatio(light.heroPrimaryText, "#F8FBFD") >= 4.5);
  assert.ok(contrastRatio(light.heroAccentText, "#F8FBFD") >= 4.5);
  assert.equal(publicThemeTokens("#153B5B", "#2F80B7").primaryForeground, "#FFFFFF");
});
