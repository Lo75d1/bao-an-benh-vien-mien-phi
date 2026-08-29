import assert from "node:assert/strict";
import test from "node:test";
import { mealOverrideForClock } from "../src/lib/demo-meal-context";
import { mealTimePhase, pickLifecycleMeal } from "../src/lib/meal-events";

const demoNow = new Date("2026-08-29T09:30:00.000Z");
const meals = [
  { id: "sang", mealDate: new Date("2026-08-29T00:00:00.000Z"), cutoffTime: "05:00", serviceTime: "06:30", status: "PLANNED" as const },
  { id: "chieu", mealDate: new Date("2026-08-29T00:00:00.000Z"), cutoffTime: "14:00", serviceTime: "17:00", status: "PLANNED" as const },
];

test("Demo Time bỏ meal Sáng cũ để Bếp chọn Chiều theo effectiveTime", () => {
  const requested = mealOverrideForClock("sang", true);
  const selected = meals.find((meal) => meal.id === requested) ?? pickLifecycleMeal(meals, demoNow)?.meal;
  assert.equal(selected?.id, "chieu");
  assert.equal(selected && mealTimePhase(selected.mealDate, selected.cutoffTime, selected.serviceTime, demoNow), "PREPARING");
});

test("Quản trị bỏ meal Sáng cũ khi có Demo Time", () => {
  assert.equal(mealOverrideForClock("06:30", true), undefined);
});

test("không có Demo Time vẫn giữ meal được chọn", () => {
  assert.equal(mealOverrideForClock("sang", false), "sang");
  assert.equal(mealOverrideForClock("06:30", false), "06:30");
});
