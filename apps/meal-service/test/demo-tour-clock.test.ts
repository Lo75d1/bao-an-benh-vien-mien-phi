import assert from "node:assert/strict";
import test from "node:test";
import {
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
