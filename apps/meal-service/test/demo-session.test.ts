import assert from "node:assert/strict";
import test from "node:test";
import { demoSessionEnabled, demoWorkspaceIdentity, emptyDemoState, isDemoTourScenarioMeal, isDemoWorkspace } from "../src/lib/demo-session";

test("Demo Session cần cờ kép và production không bật được", () => {
  assert.equal(demoSessionEnabled({ DEMO_MODE: "1" }), false);
  assert.equal(demoSessionEnabled({ DEMO_DATASET: "1" }), false);
  assert.equal(demoSessionEnabled({ DEMO_MODE: "1", DEMO_DATASET: "1" }), true);
});
test("chỉ nhận đúng năm workspace và giữ NORMAL/Sonde riêng", () => {
  for (const value of ["NURSE", "DIETITIAN", "KITCHEN_NORMAL", "ADMIN", "KITCHEN_SONDE"]) assert.equal(isDemoWorkspace(value), true);
  assert.equal(isDemoWorkspace("KITCHEN"), false);
  assert.equal(demoWorkspaceIdentity("KITCHEN_NORMAL").kitchenRoute, "NORMAL");
  assert.equal(demoWorkspaceIdentity("KITCHEN_SONDE").kitchenRoute, "SONDE");
});
test("mỗi Demo Session bắt đầu bằng state độc lập", () => {
  const first = emptyDemoState(); const second = emptyDemoState();
  first.dietStatuses.meal = "PREPARED";
  assert.deepEqual(second.dietStatuses, {});
  assert.deepEqual(second.tourScenario, {});
});

test("scenario tour chỉ che business facts nền của đúng bữa", () => {
  const state = emptyDemoState();
  state.tourScenario.NORMAL = { mealEventId: "meal-tour", initializedAt: "2026-08-29T00:00:00.000Z" };
  assert.equal(isDemoTourScenarioMeal(state, "meal-tour"), true);
  assert.equal(isDemoTourScenarioMeal(state, "meal-khac"), false);
  state.reports.push({ mealEventId: "meal-tour", departmentId: "khoa-noi", reportedByName: "Điều dưỡng Demo", submittedAt: "2026-08-29T00:10:00.000Z", lines: [] });
  assert.equal(state.reports[0]?.mealEventId, "meal-tour");
});
