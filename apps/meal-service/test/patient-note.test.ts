import assert from "node:assert/strict";
import test from "node:test";
import { publicMealEvidenceUrl, staffMealEvidenceUrl } from "../src/lib/evidence-storage";
import { approvedNotesOnly, clientIpFromHeaders, hashClientIp, isPatientNoteRateLimited, kitchenForwardedNotesOnly, normalizeSubmissionType, patientSubmissionSpamHash, publicDietMeal, publicPatientNotes, selectPublicMealWindow } from "../src/lib/patient-note";

test("chỉ ghi chú APPROVED được chuyển tới bếp", () => {
  const visible = approvedNotesOnly([
    { status: "RECEIVED" as const, note: "đang chờ" },
    { status: "APPROVED" as const, note: "đã xác nhận" },
    { status: "REJECTED" as const, note: "đã từ chối" },
  ]);
  assert.deepEqual(visible, [{ note: "đã xác nhận" }]);
});

test("workflow mới chỉ chuyển MEAL_NOTE đã forward tới bếp", () => {
  const visible = kitchenForwardedNotesOnly([
    { submissionStatus: "NEW" as const, status: "RECEIVED" as const, note: "mới" },
    { submissionStatus: "FORWARDED_TO_KITCHEN" as const, status: "APPROVED" as const, note: "đã chuyển" },
    { submissionStatus: "RESOLVED" as const, status: "RECEIVED" as const, note: "đã xử lý" },
  ]);
  assert.deepEqual(visible, [{ note: "đã chuyển" }]);
  assert.equal(normalizeSubmissionType("FEEDBACK"), "FEEDBACK");
  assert.equal(normalizeSubmissionType("khác"), "MEAL_NOTE");
});

test("projection công khai không chứa internalNote", () => {
  const projected = publicDietMeal({ patientVisibleNote: "Bệnh nhân được xem", internalNote: "Chỉ nội bộ" });
  assert.deepEqual(projected, { patientVisibleNote: "Bệnh nhân được xem" });
  assert.equal("internalNote" in projected, false);
});

test("ghi chú công khai giữ đúng nguồn và loại bỏ nội dung trùng", () => {
  assert.deepEqual(publicPatientNotes("Dùng khi còn ấm", "Ăn chậm"), [
    { source: "DIETITIAN", text: "Dùng khi còn ấm" },
    { source: "DEPARTMENT", text: "Ăn chậm" },
  ]);
  assert.deepEqual(publicPatientNotes("Dùng khi còn ấm", "Dùng khi còn ấm"), [
    { source: "DIETITIAN", text: "Dùng khi còn ấm" },
  ]);
});

test("ipHash không lưu IP thô và rate-limit theo cửa sổ một giờ", () => {
  const ip = clientIpFromHeaders("203.0.113.7, 10.0.0.1", null);
  assert.equal(ip, "203.0.113.7");
  const hash = hashClientIp(ip!, "a-private-test-salt");
  assert.notEqual(hash, ip);
  assert.equal(hash.includes(ip!), false);
  const now = new Date("2026-08-21T08:00:00.000Z");
  assert.equal(isPatientNoteRateLimited([new Date("2026-08-21T07:10:00Z"), new Date("2026-08-21T07:20:00Z")], now), false);
  assert.equal(isPatientNoteRateLimited([new Date("2026-08-21T07:10:00Z"), new Date("2026-08-21T07:20:00Z"), new Date("2026-08-21T07:30:00Z")], now), true);
});

test("ưu tiên IP do reverse proxy xác nhận và ảnh dùng URL cùng origin", () => {
  assert.equal(clientIpFromHeaders("198.51.100.9", "203.0.113.7"), "203.0.113.7");
  assert.equal(publicMealEvidenceUrl("ảnh có khoảng trắng"), "/api/public/evidence/%E1%BA%A3nh%20c%C3%B3%20kho%E1%BA%A3ng%20tr%E1%BA%AFng");
  assert.equal(staffMealEvidenceUrl("ảnh có khoảng trắng"), "/api/evidence/%E1%BA%A3nh%20c%C3%B3%20kho%E1%BA%A3ng%20tr%E1%BA%AFng");
});

test("trang bệnh nhân tách đúng suất hiện tại và suất kế tiếp", () => {
  const meals = [
    { id: "sang", at: new Date("2026-08-28T23:30:00.000Z") },
    { id: "trua", at: new Date("2026-08-29T04:30:00.000Z") },
    { id: "chieu", at: new Date("2026-08-29T10:00:00.000Z") },
  ];
  const beforeBreakfast = selectPublicMealWindow(meals, new Date("2026-08-28T23:00:00.000Z"));
  assert.equal(beforeBreakfast.current, null);
  assert.equal(beforeBreakfast.next?.id, "sang");
  const afterLunch = selectPublicMealWindow(meals, new Date("2026-08-29T05:00:00.000Z"));
  assert.equal(afterLunch.current?.id, "trua");
  assert.equal(afterLunch.next?.id, "chieu");
});

test("public submission khong chan gui khi proxy hoac salt chong spam chua san sang", () => {
  assert.equal(patientSubmissionSpamHash(null, "a-private-test-salt"), null);
  assert.equal(patientSubmissionSpamHash("203.0.113.7", ""), null);
  assert.equal(patientSubmissionSpamHash("203.0.113.7", undefined), null);
  assert.equal(typeof patientSubmissionSpamHash("203.0.113.7", "a-private-test-salt"), "string");
});
