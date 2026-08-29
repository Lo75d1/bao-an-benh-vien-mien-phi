import assert from "node:assert/strict";
import test from "node:test";
import { deliveryReceiptAvailability, expectedQuantityFromHandoff, normalizeDeliveryReceipt, normalizeReceiptCorrectionReason } from "../src/lib/delivery-receipt";

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

test("UI giao nhận chỉ sẵn sàng sau handoff và giữ snapshot khi reload", () => {
  assert.deepEqual(deliveryReceiptAvailability(null, null), { status: "WAITING_HANDOFF", expectedQuantity: null });
  assert.deepEqual(deliveryReceiptAvailability({ quantity: 36 }, null), { status: "READY", expectedQuantity: 36 });
  assert.deepEqual(deliveryReceiptAvailability({ quantity: 36 }, { expectedQuantity: 36 }), { status: "CONFIRMED", expectedQuantity: 36 });
});

test("receipt bắt buộc handoff và lấy expectedQuantity từ snapshot", () => {
  assert.throws(() => expectedQuantityFromHandoff(null));
  assert.equal(expectedQuantityFromHandoff({ quantity: 36 }), 36);
  assert.deepEqual(normalizeDeliveryReceipt({ status: "FULL", expectedQuantity: expectedQuantityFromHandoff({ quantity: 36 }), receivedQuantity: 36, note: "" }), { status: "FULL", receivedQuantity: 36, note: null });
  assert.deepEqual(normalizeDeliveryReceipt({ status: "SHORT", expectedQuantity: expectedQuantityFromHandoff({ quantity: 36 }), receivedQuantity: 34, note: "Thiếu 2 suất" }), { status: "SHORT", receivedQuantity: 34, note: "Thiếu 2 suất" });
});
