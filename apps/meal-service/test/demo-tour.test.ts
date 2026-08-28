import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionTour,
  DEMO_TOUR_STEPS,
  normalizeTourProgress,
} from "../src/lib/demo-tour";

test("Guided Demo có đúng năm workspace độc lập", () => {
  assert.deepEqual(Object.keys(DEMO_TOUR_STEPS).sort(), [
    "ADMIN",
    "DIETITIAN",
    "KITCHEN_NORMAL",
    "KITCHEN_SONDE",
    "NURSE",
  ]);
  for (const steps of Object.values(DEMO_TOUR_STEPS))
    assert.ok(steps.length > 0);
});

test("mỗi bước yêu cầu đúng một tương tác trên control cụ thể", () => {
  for (const steps of Object.values(DEMO_TOUR_STEPS))
    for (const step of steps) {
      assert.ok(step.target.length > 0);
      assert.ok(step.instruction.length > 0);
      assert.ok(step.timeline.milestone.length > 0);
      assert.ok(
        ["PLANNING", "REPORTING", "PREPARATION", "SERVICE", "CLOSED"].includes(
          step.timeline.stage,
        ),
      );
      assert.ok(
        step.expectation.type === "action"
          ? step.expectation.actionId
          : step.expectation.selector,
      );
    }
});

test("tour đi qua đủ các mốc nghiệp vụ và tự tách lịch Sonde", () => {
  assert.deepEqual(
    [...new Set(DEMO_TOUR_STEPS.NURSE.map((step) => step.timeline.stage))],
    ["REPORTING", "SERVICE"],
  );
  assert.ok(
    DEMO_TOUR_STEPS.KITCHEN_NORMAL.every(
      (step) => step.timeline.stage === "PREPARATION",
    ),
  );
  assert.ok(
    DEMO_TOUR_STEPS.KITCHEN_SONDE.every(
      (step) => step.timeline.stage === "PREPARATION",
    ),
  );
  assert.equal(DEMO_TOUR_STEPS.ADMIN.at(-1)?.timeline.stage, "CLOSED");
});

test("tiến độ reload giữ NORMAL và Sonde riêng", () => {
  const progress = normalizeTourProgress({
    KITCHEN_NORMAL: { status: "DONE", step: 4 },
    KITCHEN_SONDE: { status: "ACTIVE", step: 2 },
    NURSE: { status: "SKIPPED", step: -1 },
  });
  assert.deepEqual(progress.KITCHEN_NORMAL, { status: "DONE", step: 4 });
  assert.deepEqual(progress.KITCHEN_SONDE, { status: "ACTIVE", step: 2 });
  assert.equal(progress.NURSE, undefined);
});

test("không thể bỏ qua action bắt buộc hoặc đánh dấu hoàn tất sớm", () => {
  assert.equal(
    canTransitionTour(
      { status: "NOT_STARTED", step: 0 },
      { status: "ACTIVE", step: 0 },
      4,
    ),
    true,
  );
  assert.equal(
    canTransitionTour(
      { status: "ACTIVE", step: 0 },
      { status: "ACTIVE", step: 2 },
      4,
    ),
    false,
  );
  assert.equal(
    canTransitionTour(
      { status: "ACTIVE", step: 1 },
      { status: "DONE", step: 4 },
      4,
    ),
    false,
  );
  assert.equal(
    canTransitionTour(
      { status: "ACTIVE", step: 3 },
      { status: "DONE", step: 4 },
      4,
    ),
    true,
  );
});
