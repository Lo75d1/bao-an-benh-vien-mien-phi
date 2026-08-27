import assert from "node:assert/strict";
import test from "node:test";
import { foodRetentionLabel, foodRetentionState } from "../src/lib/food-retention";

test("mẫu lưu còn thời gian trong vòng 24 giờ", () => {
  const uploadedAt = new Date("2026-08-27T01:00:00.000Z");
  const now = new Date("2026-08-27T02:30:00.000Z");
  assert.deepEqual(foodRetentionState(uploadedAt, now), { status: "RETAINING", remainingMinutes: 1350 });
  assert.equal(foodRetentionLabel(uploadedAt, now), "Đang lưu mẫu · còn 22 giờ 30 phút");
});

test("mẫu lưu hoàn thành sau đủ 24 giờ", () => {
  const uploadedAt = new Date("2026-08-26T01:00:00.000Z");
  const now = new Date("2026-08-27T01:00:00.000Z");
  assert.deepEqual(foodRetentionState(uploadedAt, now), { status: "COMPLETED", remainingMinutes: 0 });
  assert.equal(foodRetentionLabel(uploadedAt, now), "Đã đủ 24 giờ");
});
