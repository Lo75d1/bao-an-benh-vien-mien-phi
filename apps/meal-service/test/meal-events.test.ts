import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarScope, restrictWeekForRole, rollupMealEventStatus, startOfIsoWeek, toDateKey } from "../src/lib/meal-events";

test("NURSE chỉ lấy báo suất thuộc khoa được gán", () => {
  assert.deepEqual(buildCalendarScope("NURSE", ["dept-noi"]), {
    departmentIds: ["dept-noi"],
    reportWhere: { departmentId: { in: ["dept-noi"] } },
  });
  assert.deepEqual(buildCalendarScope("ADMIN", ["dept-noi"]), { departmentIds: [] });
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
  assert.equal(toDateKey(restrictWeekForRole("ADMIN", new Date("2026-09-07T00:00:00.000Z"), now)), "2026-09-07");
});
