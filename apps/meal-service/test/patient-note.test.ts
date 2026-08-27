import assert from "node:assert/strict";
import test from "node:test";
import { publicMealEvidenceUrl } from "../src/lib/evidence-storage";
import { approvedNotesOnly, clientIpFromHeaders, hashClientIp, isPatientNoteRateLimited, publicDietMeal } from "../src/lib/patient-note";

test("chỉ ghi chú APPROVED được chuyển tới bếp", () => {
  const visible = approvedNotesOnly([
    { status: "RECEIVED" as const, note: "đang chờ" },
    { status: "APPROVED" as const, note: "đã duyệt" },
    { status: "REJECTED" as const, note: "đã từ chối" },
  ]);
  assert.deepEqual(visible, [{ note: "đã duyệt" }]);
});

test("projection công khai không chứa internalNote", () => {
  const projected = publicDietMeal({ patientVisibleNote: "Bệnh nhân được xem", internalNote: "Chỉ nội bộ" });
  assert.deepEqual(projected, { patientVisibleNote: "Bệnh nhân được xem" });
  assert.equal("internalNote" in projected, false);
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
});
