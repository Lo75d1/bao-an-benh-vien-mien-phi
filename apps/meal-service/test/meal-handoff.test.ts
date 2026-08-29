import assert from "node:assert/strict";
import test from "node:test";
import { buildHandoffSnapshots, handoffPersistenceDecision } from "../src/lib/meal-handoff";

const source = {
  route: "NORMAL" as const,
  dietStatuses: ["PREPARED", "PREPARED"] as const,
  reports: [
    { departmentId: "khoa-noi", quantities: [20, 5] },
    { departmentId: "khoa-ngoai", quantities: [12, 3] },
  ],
  additions: [{ departmentId: "khoa-noi", quantity: 2 }],
};

test("không bàn giao khi chưa chuẩn bị xong", () => {
  assert.throws(() => buildHandoffSnapshots({ ...source, dietStatuses: ["PREPARED", "PREPARING"] }, "NORMAL"));
});

test("đúng route tạo snapshot riêng cho từng khoa", () => {
  assert.deepEqual(buildHandoffSnapshots(source, "NORMAL"), [
    { departmentId: "khoa-ngoai", quantity: 15 },
    { departmentId: "khoa-noi", quantity: 27 },
  ]);
});

test("sai route và NORMAL Sonde bị cách ly", () => {
  assert.throws(() => buildHandoffSnapshots(source, "SONDE"));
  assert.throws(() => buildHandoffSnapshots({ ...source, route: "SONDE" }, "NORMAL"));
});

test("handoff lặp cùng quantity không tạo thay đổi", () => {
  assert.equal(handoffPersistenceDecision(null, 27), "CREATE");
  assert.equal(handoffPersistenceDecision(27, 27), "UNCHANGED");
  assert.equal(handoffPersistenceDecision(27, 28), "UPDATE");
});
