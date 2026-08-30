import assert from "node:assert/strict";
import test from "node:test";
import { deliveryReceiptAvailability, isKitchenHandoffReady, normalizeDeliveryReceipt, normalizeReceiptCorrectionReason } from "../src/lib/delivery-receipt";

test("nhan du phai khop so suat du kien", () => {
  assert.deepEqual(normalizeDeliveryReceipt({ status: "FULL", expectedQuantity: 20, receivedQuantity: 20, note: "" }), { status: "FULL", receivedQuantity: 20, note: null });
  assert.throws(() => normalizeDeliveryReceipt({ status: "FULL", expectedQuantity: 20, receivedQuantity: 19, note: "" }));
});

test("nhan thieu bat buoc so thuc nhan nho hon va co ly do", () => {
  assert.deepEqual(normalizeDeliveryReceipt({ status: "SHORT", expectedQuantity: 20, receivedQuantity: 18, note: "Thieu 2 suat" }), { status: "SHORT", receivedQuantity: 18, note: "Thieu 2 suat" });
  assert.throws(() => normalizeDeliveryReceipt({ status: "SHORT", expectedQuantity: 20, receivedQuantity: 20, note: "Du" }));
  assert.throws(() => normalizeDeliveryReceipt({ status: "SHORT", expectedQuantity: 20, receivedQuantity: 18, note: "" }));
});

test("sua xac nhan bat buoc ly do du ro", () => {
  assert.equal(normalizeReceiptCorrectionReason("  Khoa kiem dem lai  "), "Khoa kiem dem lai");
  assert.throws(() => normalizeReceiptCorrectionReason(""));
  assert.throws(() => normalizeReceiptCorrectionReason("x".repeat(501)));
});

test("chi cho xac nhan giao nhan sau khi Bep da ban giao route hien hanh", () => {
  assert.equal(isKitchenHandoffReady([]), false);
  assert.equal(isKitchenHandoffReady(["PLANNED"]), false);
  assert.equal(isKitchenHandoffReady(["PREPARED", "SERVED"]), true);
  assert.deepEqual(deliveryReceiptAvailability(["PREPARING"], null), { status: "WAITING_HANDOFF", expectedQuantity: null });
  assert.deepEqual(deliveryReceiptAvailability(["PREPARED"], null), { status: "READY" });
  assert.deepEqual(deliveryReceiptAvailability(["PREPARED"], { expectedQuantity: 12 }), { status: "CONFIRMED" });
});
