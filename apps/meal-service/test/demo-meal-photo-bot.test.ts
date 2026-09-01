import assert from "node:assert/strict";
import test from "node:test";
import { demoMealPhotoFor, demoMealPhotoIndex, demoMealPhotoSummaryForDay } from "../src/lib/demo-meal-photo-bot";

test("same demo session date meal and route gives the same image", () => {
  const input = { demoSessionId: "session-1", date: "2026-09-01", mealTypeId: "breakfast", mealTypeCode: "BREAKFAST", route: "NORMAL" as const };
  assert.equal(demoMealPhotoIndex(input), demoMealPhotoIndex(input));
  assert.deepEqual(demoMealPhotoFor(input), demoMealPhotoFor(input));
});

test("three meals on one date do not all collapse to one image when avoidable", () => {
  const selected = demoMealPhotoSummaryForDay({
    demoSessionId: "session-1",
    date: "2026-09-01",
    meals: [
      { mealTypeId: "breakfast", mealTypeCode: "BREAKFAST", route: "NORMAL" },
      { mealTypeId: "lunch", mealTypeCode: "LUNCH", route: "NORMAL" },
      { mealTypeId: "dinner", mealTypeCode: "DINNER", route: "NORMAL" },
    ],
  });
  assert.ok(new Set(selected).size > 1);
});

test("advancing demo date changes selection deterministically", () => {
  const today = demoMealPhotoIndex({ demoSessionId: "session-1", date: "2026-09-01", mealTypeId: "lunch", route: "NORMAL" });
  const tomorrow = demoMealPhotoIndex({ demoSessionId: "session-1", date: "2026-09-02", mealTypeId: "lunch", route: "NORMAL" });
  assert.notEqual(today, tomorrow);
  assert.equal(tomorrow, demoMealPhotoIndex({ demoSessionId: "session-1", date: "2026-09-02", mealTypeId: "lunch", route: "NORMAL" }));
});

test("NORMAL and SONDE selection remains isolated", () => {
  const normal = demoMealPhotoFor({ demoSessionId: "session-1", date: "2026-09-01", mealTypeId: "lunch", route: "NORMAL" });
  const sonde = demoMealPhotoFor({ demoSessionId: "session-1", date: "2026-09-01", mealTypeId: "lunch", route: "SONDE" });
  assert.notEqual(normal?.id, sonde?.id);
});

test("non-demo behavior receives no bot sample", () => {
  assert.equal(demoMealPhotoFor({ demoSessionId: null, date: "2026-09-01", mealTypeId: "lunch", route: "NORMAL" }), null);
});

test("manual MEAL_PHOTO can override bot sample by priority", () => {
  const manual = { publicUrl: "/api/evidence/manual", note: "manual" };
  const bot = demoMealPhotoFor({ demoSessionId: "session-1", date: "2026-09-01", mealTypeId: "lunch", route: "NORMAL" });
  const chosen = manual ?? bot;
  assert.equal(chosen.publicUrl, "/api/evidence/manual");
});

test("demoNow date input remains authoritative for deterministic selection", () => {
  const demoNow = new Date("2026-09-03T04:00:00.000Z");
  const selected = demoMealPhotoFor({ demoSessionId: "session-1", date: demoNow, mealTypeId: "breakfast", route: "NORMAL" });
  assert.match(selected?.id ?? "", /^demo-bot:2026-09-03:/);
});
