import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDeliveryReceipt, normalizeReceiptCorrectionReason } from "../src/lib/delivery-receipt";

test("nhận đủ phải khớp số suất dự kiến", () => {
  assert.deepEqual(normalizeDeliveryReceipt({ status: "FULL", expectedQuantity: 20, receivedQuantity: 20, note: "" }), { status: "FULL", receivedQuantity: 20, note: null });
  assert.throws(() => normalizeDeliveryReceipt({ status: "FULL", expectedQuantity: 20, receivedQuantity: 19, note: "" }));
});

test("nhận thiếu bắt buộc số thực nhận nhỏ hơn và có lý do", () => {
  assert.deepEqual(normalizeDeliveryReceipt({ status: "SHORT", expectedQuantity: 20, receivedQuantity: 18, note: "Thiếu 2 suất" }), { status: "SHORT", receivedQuantity: 18, note: "Thiếu 2 suất" });
  assert.throws(() => normalizeDeliveryReceipt({ status: "SHORT", expectedQuantity: 20, receivedQuantity: 20, note: "Đủ" }));
  assert.throws(() => normalizeDeliveryReceipt({ status: "SHORT", expectedQuantity: 20, receivedQuantity: 18, note: "" }));
});

test("sửa xác nhận bắt buộc lý do đủ rõ", () => {
  assert.equal(normalizeReceiptCorrectionReason("  Khoa kiểm đếm lại  "), "Khoa kiểm đếm lại");
  assert.throws(() => normalizeReceiptCorrectionReason(""));
  assert.throws(() => normalizeReceiptCorrectionReason("x".repeat(501)));
});
