import assert from "node:assert/strict";
import test from "node:test";
import { currentNurseWorkflow } from "../src/lib/nurse-workflow";

const meals = [{ id: "trua", name: "Bữa trưa", mealDate: "2026-08-23", cutoffTime: "09:00", serviceTime: "11:00" }, { id: "chieu", name: "Bữa chiều", mealDate: "2026-08-23", cutoffTime: "14:00", serviceTime: "17:00" }];

test("điều dưỡng đi đúng ba chặng và không nhảy cóc", () => {
  assert.equal(currentNurseWorkflow(meals, 60, new Date("2026-08-23T01:30:00Z"))?.phase, "REPORTING");
  assert.equal(currentNurseWorkflow(meals, 60, new Date("2026-08-23T02:30:00Z"))?.phase, "PREPARING");
  assert.equal(currentNurseWorkflow(meals, 60, new Date("2026-08-23T04:30:00Z"))?.phase, "SERVING");
  assert.equal(currentNurseWorkflow(meals, 60, new Date("2026-08-23T05:30:00Z"))?.meal.id, "chieu");
});
