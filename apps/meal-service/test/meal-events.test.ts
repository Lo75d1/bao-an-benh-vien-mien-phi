import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarScope, displayMealState, pickActiveReportingMeal, restrictWeekForRole, rollupMealEventStatus, startOfIsoWeek, toDateKey } from "../src/lib/meal-events";

test("NURSE chỉ lấy báo suất thuộc khoa được gán", () => {
  assert.deepEqual(buildCalendarScope("NURSE", ["dept-noi"]), {
    departmentIds: ["dept-noi"],
    reportWhere: { departmentId: { in: ["dept-noi"] } },
  });
  assert.deepEqual(buildCalendarScope("ADMIN", ["dept-noi"]), { departmentIds: [] });
});

test("calendar chooses only one same-day active reporting meal for demoNow", () => {
  const mealDate = new Date("2026-08-29T00:00:00.000Z");
  const meals = [
    { id: "sang", mealDate, cutoffTime: "05:00", serviceTime: "06:30" },
    { id: "trua", mealDate, cutoffTime: "11:30", serviceTime: "12:30" },
    { id: "chieu", mealDate, cutoffTime: "17:00", serviceTime: "18:00" },
  ];

  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-28T20:00:00.000Z"))?.id, "sang");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-28T22:30:00.000Z"))?.id, "sang");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-29T04:00:00.000Z"))?.id, "trua");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-29T07:30:00.000Z"))?.id, "chieu");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-29T12:30:00.000Z")), null);
});

test("calendar does not activate past or future dates", () => {
  const now = new Date("2026-08-29T04:00:00.000Z");
  const pastMeal = { id: "past", mealDate: new Date("2026-08-28T00:00:00.000Z"), cutoffTime: "11:30", serviceTime: "12:30" };
  const todayMeal = { id: "today", mealDate: new Date("2026-08-29T00:00:00.000Z"), cutoffTime: "11:30", serviceTime: "12:30" };
  const futureMeal = { id: "future", mealDate: new Date("2026-08-30T00:00:00.000Z"), cutoffTime: "11:30", serviceTime: "12:30" };

  assert.equal(pickActiveReportingMeal([pastMeal], now), null);
  assert.equal(pickActiveReportingMeal([futureMeal], now), null);
  assert.equal(pickActiveReportingMeal([pastMeal, todayMeal, futureMeal], now)?.id, "today");
});

test("advancing demoNow selects the next active reporting meal", () => {
  const mealDate = new Date("2026-08-29T00:00:00.000Z");
  const meals = [
    { id: "sang", mealDate, cutoffTime: "05:00", serviceTime: "06:30" },
    { id: "trua", mealDate, cutoffTime: "11:30", serviceTime: "12:30" },
    { id: "chieu", mealDate, cutoffTime: "17:00", serviceTime: "18:00" },
  ];

  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-28T20:00:00.000Z"))?.id, "sang");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-29T04:00:00.000Z"))?.id, "trua");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-29T07:30:00.000Z"))?.id, "chieu");
});

test("rollup MealEvent dùng trạng thái sớm nhất còn hoạt động", () => {
  assert.equal(rollupMealEventStatus([]), null);
  assert.equal(rollupMealEventStatus(["SERVED", "PREPARING", "PREPARED"]), "PREPARING");
  assert.equal(rollupMealEventStatus(["CANCELLED", "SERVED"]), "SERVED");
  assert.equal(rollupMealEventStatus(["CANCELLED"]), "CANCELLED");
});

test("role thường chỉ được xem tuần này hoặc tuần sau", () => {
  const now = new Date("2026-08-21T00:00:00.000Z");
  assert.equal(toDateKey(startOfIsoWeek(now)), "2026-08-17");
  assert.equal(toDateKey(restrictWeekForRole("NURSE", new Date("2026-09-07T00:00:00.000Z"), now)), "2026-08-17");
  assert.equal(toDateKey(restrictWeekForRole("NURSE", new Date("2026-08-24T00:00:00.000Z"), now)), "2026-08-24");
  assert.equal(toDateKey(restrictWeekForRole("NURSE", new Date("2026-08-10T00:00:00.000Z"), now)), "2026-08-10");
  assert.equal(toDateKey(restrictWeekForRole("ADMIN", new Date("2026-09-07T00:00:00.000Z"), now)), "2026-09-07");
});

test("trạng thái lịch kết hợp giờ Việt Nam và trạng thái đã lưu", () => {
  const day = new Date("2026-08-23T00:00:00.000Z");
  assert.equal(displayMealState(day, "05:00", "06:30", "PLANNED", new Date("2026-08-22T21:30:00.000Z"))?.key, "REPORTING");
  assert.equal(displayMealState(day, "05:00", "06:30", "PLANNED", new Date("2026-08-22T22:00:00.000Z"))?.key, "PREPARATION");
  assert.equal(displayMealState(day, "05:00", "06:30", "PLANNED", new Date("2026-08-22T23:45:00.000Z"))?.key, "SERVICE");
  assert.equal(displayMealState(day, "05:00", "06:30", "SERVED", new Date("2026-08-23T01:00:00.000Z"))?.key, "CLOSED");
  assert.equal(displayMealState(day, "05:00", "06:30", "PREPARED", new Date("2026-08-23T01:00:00.000Z"))?.key, "CLOSED");
  assert.equal(displayMealState(new Date("2026-08-24T00:00:00.000Z"), "05:00", "06:30", "PLANNED", new Date("2026-08-23T01:00:00.000Z"))?.key, "UPCOMING");
  assert.equal(displayMealState(day, "05:00", "17:00", "PREPARED", new Date("2026-08-23T01:00:00.000Z"))?.key, "PREPARATION");
  assert.equal(displayMealState(day, "05:00", "17:00", null, new Date("2026-08-23T01:00:00.000Z")), null);
});
