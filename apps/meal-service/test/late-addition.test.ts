import assert from "node:assert/strict";
import test from "node:test";
import { ACK_LABEL, additionKindFor, assertAckStatus, assertAdditionRoute, normalizeAdditionReason, servingTotal, shouldLockMeal } from "../src/lib/late-addition";

const mealDate = new Date("2026-08-21T00:00:00.000Z");

test("báo bổ sung không được đi chéo giữa lịch thường và lịch Sonde", () => {
  assert.doesNotThrow(() => assertAdditionRoute("SONDE", "SONDE", "SONDE"));
  assert.throws(() => assertAdditionRoute("SONDE", "NORMAL", "SONDE"), /đường nuôi/);
  assert.throws(() => assertAdditionRoute("NORMAL", "NORMAL", "SONDE"), /đường nuôi/);
});

test("qua giờ chốt chỉ khóa số suất gốc đang PLANNED", () => {
  assert.equal(shouldLockMeal(mealDate, "09:00", "PLANNED", new Date("2026-08-21T02:00:00.000Z")), true);
  assert.equal(shouldLockMeal(mealDate, "09:00", "PLANNED", new Date("2026-08-21T01:59:59.000Z")), false);
  assert.equal(shouldLockMeal(mealDate, "09:00", "SERVED", new Date("2026-08-21T03:00:00.000Z")), false);
});

test("20 suất gốc cộng riêng 1 suất bổ sung thành 21 và gốc vẫn là 20", () => {
  assert.deepEqual(servingTotal(20, [{ quantity: 1 }]), { original: 20, additions: 1, total: 21 });
});

test("lý do bổ sung bắt buộc và số bổ sung phải dương", () => {
  assert.equal(normalizeAdditionReason("  Người bệnh mới nhập viện "), "Người bệnh mới nhập viện");
  assert.throws(() => normalizeAdditionReason("   "), /bắt buộc/);
  assert.throws(() => servingTotal(20, [{ quantity: 0 }]), /nguyên dương/);
});

test("bếp chỉ ack bằng ba trạng thái nghiệp vụ", () => {
  assert.deepEqual(Object.values(ACK_LABEL), ["Đã nhận", "Không đủ", "Cần thay thế"]);
  assert.doesNotThrow(() => assertAckStatus("RECEIVED"));
  assert.doesNotThrow(() => assertAckStatus("INSUFFICIENT"));
  assert.doesNotThrow(() => assertAckStatus("SUBSTITUTE"));
  assert.throws(() => assertAckStatus("PENDING"));
});

test("bổ sung sau SERVED là khẩn và không reopen lịch sử", () => {
  const status = "SERVED" as const;
  assert.equal(additionKindFor(status), "URGENT_POST_SERVE");
  assert.equal(status, "SERVED");
  assert.equal(additionKindFor("LOCKED"), "SUPPLEMENT");
});
