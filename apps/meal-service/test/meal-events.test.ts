import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarScope, displayMealState, restrictWeekForRole, rollupMealEventStatus, startOfIsoWeek, toDateKey } from "../src/lib/meal-events";

test("NURSE chi lay bao suat thuoc khoa duoc gan", () => {
  assert.deepEqual(buildCalendarScope("NURSE", ["dept-noi"]), {
    departmentIds: ["dept-noi"],
    reportWhere: { departmentId: { in: ["dept-noi"] } },
  });
  assert.deepEqual(buildCalendarScope("ADMIN", ["dept-noi"]), { departmentIds: [] });
});

test("rollup MealEvent dung trang thai muon nhat con hoat dong", () => {
  assert.equal(rollupMealEventStatus([]), null);
  assert.equal(rollupMealEventStatus(["PLANNED", "LOCKED"]), "LOCKED");
  assert.equal(rollupMealEventStatus(["LOCKED", "PREPARING"]), "PREPARING");
  assert.equal(rollupMealEventStatus(["PREPARING", "PREPARED"]), "PREPARED");
  assert.equal(rollupMealEventStatus(["PREPARED", "SERVED"]), "SERVED");
  assert.equal(rollupMealEventStatus(["PLANNED", "SERVED"]), "SERVED");
  assert.equal(rollupMealEventStatus(["CANCELLED", "PLANNED"]), "PLANNED");
  assert.equal(rollupMealEventStatus(["CANCELLED", "PREPARED"]), "PREPARED");
  assert.equal(rollupMealEventStatus(["CANCELLED", "SERVED"]), "SERVED");
  assert.equal(rollupMealEventStatus(["CANCELLED", "CANCELLED"]), "CANCELLED");
});

test("role thuong chi duoc xem tuan nay hoac tuan sau", () => {
  const now = new Date("2026-08-21T00:00:00.000Z");
  assert.equal(toDateKey(startOfIsoWeek(now)), "2026-08-17");
  assert.equal(toDateKey(restrictWeekForRole("NURSE", new Date("2026-09-07T00:00:00.000Z"), now)), "2026-08-17");
  assert.equal(toDateKey(restrictWeekForRole("NURSE", new Date("2026-08-24T00:00:00.000Z"), now)), "2026-08-24");
  assert.equal(toDateKey(restrictWeekForRole("NURSE", new Date("2026-08-10T00:00:00.000Z"), now)), "2026-08-10");
  assert.equal(toDateKey(restrictWeekForRole("ADMIN", new Date("2026-09-07T00:00:00.000Z"), now)), "2026-09-07");
});

test("trang thai lich ket hop gio Viet Nam va trang thai da luu", () => {
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
