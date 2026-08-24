import assert from "node:assert/strict";
import test from "node:test";
import { isKitchenPreparationOpen, mealTimePhase, nextMealTimelineEvent, nextReportingCutoff, pickReportingMeal } from "../src/lib/meal-events";

// Chuyển từ test/nurse-workflow.test.ts cũ: sau khi gộp, mốc giờ của điều dưỡng
// dùng chung `mealTimePhase` với bếp / lịch / admin.
const day = new Date("2026-08-23T00:00:00.000Z");
const trua = { cutoffTime: "09:00", serviceTime: "11:00" };
const chieu = { cutoffTime: "14:00", serviceTime: "17:00" };
const phase = (meal: { cutoffTime: string; serviceTime: string }, iso: string, completion = 60) =>
  mealTimePhase(day, meal.cutoffTime, meal.serviceTime, new Date(iso), completion);

test("một bữa đi đúng bốn mốc, không nhảy cóc", () => {
  assert.equal(phase(trua, "2026-08-23T01:30:00Z"), "BEFORE_CUTOFF"); // 08:30 VN — trước giờ chốt
  assert.equal(phase(trua, "2026-08-23T02:30:00Z"), "PREPARING");     // 09:30 VN — bếp chuẩn bị
  assert.equal(phase(trua, "2026-08-23T04:30:00Z"), "SERVING");       // 11:30 VN — đang phục vụ
  assert.equal(phase(trua, "2026-08-23T05:30:00Z"), "PASSED");        // 12:30 VN — đã qua
});

test("bữa đã qua thì bữa kế mới là bữa đang xử lý", () => {
  const meals = [trua, chieu];
  const now = "2026-08-23T05:30:00Z"; // 12:30 VN
  assert.equal(meals.findIndex((meal) => phase(meal, now) !== "PASSED"), 1);
});

test("điều dưỡng giữ bữa đang phục vụ, hết giờ mới chuyển sang bữa báo tiếp theo", () => {
  const meals = [{ id: "trua", mealDate: day, ...trua }, { id: "chieu", mealDate: day, ...chieu }];
  const serving = new Date("2026-08-23T04:30:00Z"); // 11:30 VN
  assert.equal(pickReportingMeal(meals, serving)?.id, "trua");
  const afterServing = new Date("2026-08-23T05:01:00Z"); // 12:01 VN
  assert.equal(pickReportingMeal(meals, afterServing)?.id, "chieu");
  const next = nextReportingCutoff(meals, afterServing);
  assert.equal(next?.meal.id, "chieu");
  assert.equal(next?.at.toISOString(), "2026-08-23T07:00:00.000Z");
});

test("sự kiện tiếp theo ưu tiên phục vụ chiều nay trước giờ chốt sáng mai", () => {
  const meals = [
    { id: "chieu-nay", mealDate: day, cutoffTime: "14:00", serviceTime: "17:00" },
    { id: "sang-mai", mealDate: new Date("2026-08-24T00:00:00.000Z"), cutoffTime: "05:00", serviceTime: "06:30" },
  ];
  const next = nextMealTimelineEvent(meals, new Date("2026-08-23T09:00:00.000Z")); // 16:00 VN
  assert.equal(next?.meal.id, "chieu-nay");
  assert.equal(next?.kind, "SERVICE");
  assert.equal(next?.at.toISOString(), "2026-08-23T10:00:00.000Z");
});

test("cửa sổ phục vụ theo cấu hình serviceCompletionMinutes, không cứng 60 phút", () => {
  assert.equal(phase(trua, "2026-08-23T04:20:00Z", 15), "PASSED");   // 11:20 VN, cửa sổ 15' đã hết
  assert.equal(phase(trua, "2026-08-23T04:20:00Z", 120), "SERVING"); // cùng thời điểm, cửa sổ 120' vẫn còn
});

test("giờ sai định dạng trả null để nơi gọi hiển thị —", () => {
  assert.equal(mealTimePhase(day, "9:00", "11:00", new Date("2026-08-23T01:30:00Z")), null);
  assert.equal(mealTimePhase(day, "25:00", "11:00", new Date("2026-08-23T01:30:00Z")), null);
});

test("bếp chỉ được thao tác từ đúng giờ bắt đầu chuẩn bị", () => {
  assert.equal(isKitchenPreparationOpen(day, trua.cutoffTime, trua.serviceTime, new Date("2026-08-23T01:59:59Z")), false);
  assert.equal(isKitchenPreparationOpen(day, trua.cutoffTime, trua.serviceTime, new Date("2026-08-23T02:00:00Z")), true);
  assert.equal(isKitchenPreparationOpen(day, "9:00", trua.serviceTime, new Date("2026-08-23T02:00:00Z")), false);
});
