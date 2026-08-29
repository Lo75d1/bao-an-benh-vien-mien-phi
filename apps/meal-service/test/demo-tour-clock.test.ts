import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDemoTourMealContext,
  demoTourRoute,
  demoTourStageInstant,
} from "../src/lib/demo-tour-clock";

const mealDate = new Date("2026-08-28T00:00:00.000Z");

test("mốc tour được suy ra từ giờ bữa, không hard-code giờ trình diễn", () => {
  const reporting = demoTourStageInstant(mealDate, "09:00", "11:30", "REPORTING", 60);
  const preparation = demoTourStageInstant(mealDate, "09:00", "11:30", "PREPARATION", 60);
  const service = demoTourStageInstant(mealDate, "09:00", "11:30", "SERVICE", 60);
  const closed = demoTourStageInstant(mealDate, "09:00", "11:30", "CLOSED", 60);
  assert.equal(reporting?.toISOString(), "2026-08-28T01:40:00.000Z");
  assert.equal(preparation?.toISOString(), "2026-08-28T02:05:00.000Z");
  assert.equal(service?.toISOString(), "2026-08-28T04:35:00.000Z");
  assert.equal(closed?.toISOString(), "2026-08-28T05:35:00.000Z");
});

test("Bếp Sonde dùng lịch SONDE, các workspace còn lại dùng NORMAL", () => {
  assert.equal(demoTourRoute("KITCHEN_SONDE"), "SONDE");
  assert.equal(demoTourRoute("KITCHEN_NORMAL"), "NORMAL");
  assert.equal(demoTourRoute("NURSE"), "NORMAL");
  assert.equal(demoTourRoute("DIETITIAN"), "NORMAL");
  assert.equal(demoTourRoute("ADMIN"), "NORMAL");
});

test("tour khóa đúng bữa theo từng workspace", () => {
  const context = { route: "NORMAL" as const, mealEventId: "event-trua", dietMealId: "diet-thuong", mealDate: "2026-08-29", serviceTime: "11:30" };
  const nurse = new URL("https://demo.local/bao-suat");
  applyDemoTourMealContext(nurse, "NURSE", context);
  assert.equal(nurse.searchParams.get("meal"), "event-trua");
  const dietitian = new URL("https://demo.local/thuc-don");
  applyDemoTourMealContext(dietitian, "DIETITIAN", context);
  assert.equal(dietitian.searchParams.get("meal"), "diet-thuong");
  const admin = new URL("https://demo.local/quan-ly");
  applyDemoTourMealContext(admin, "ADMIN", context);
  assert.equal(admin.searchParams.get("date"), "2026-08-29");
  assert.equal(admin.searchParams.get("meal"), "11:30");
});
