import assert from "node:assert/strict";
import test from "node:test";
import { buildHandoffSnapshots, deriveHandoffSnapshots, handoffPersistenceDecision, mergeHandoffReports } from "../src/lib/meal-handoff";

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
  assert.throws(() => buildHandoffSnapshots({ ...source, reports: [], additions: [] }, "NORMAL"));
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

test("loader Bếp không sập sau khi lưu ảnh nếu dữ liệu bàn giao chưa đồng bộ", () => {
  assert.deepEqual(deriveHandoffSnapshots({ ...source, dietStatuses: ["PREPARED", "PREPARING"] }, "NORMAL"), []);
  assert.deepEqual(deriveHandoffSnapshots({ ...source, route: "SONDE" }, "NORMAL"), []);
  assert.deepEqual(deriveHandoffSnapshots({ ...source, reports: [], additions: [] }, "NORMAL"), []);
});

test("loader Bếp dựng đúng nhiều mã CHAO DTD đường miệng sau PREPARED", () => {
  assert.deepEqual(deriveHandoffSnapshots(source, "NORMAL"), [
    { departmentId: "khoa-ngoai", quantity: 15 },
    { departmentId: "khoa-noi", quantity: 27 },
  ]);
});

test("handoff lặp cùng quantity không tạo thay đổi", () => {
  assert.equal(handoffPersistenceDecision(null, 27), "CREATE");
  assert.equal(handoffPersistenceDecision(27, 27), "UNCHANGED");
  assert.equal(handoffPersistenceDecision(27, 28), "UPDATE");
});

test("Demo handoff dùng DB reports làm baseline và giữ Nội 33 Ngoại 42", () => {
  const reports = mergeHandoffReports([
    { departmentId: "khoa-noi", lines: [{ dietTypeId: "normal-com", quantity: 33 }] },
    { departmentId: "khoa-ngoai", lines: [{ dietTypeId: "normal-com", quantity: 42 }] },
  ], [], new Set(["normal-com"]));

  assert.deepEqual(buildHandoffSnapshots({
    route: "NORMAL",
    dietStatuses: ["PREPARED"],
    reports,
    additions: [],
  }, "NORMAL"), [
    { departmentId: "khoa-ngoai", quantity: 42 },
    { departmentId: "khoa-noi", quantity: 33 },
  ]);
  assert.equal(reports.reduce((sum, report) => sum + report.quantities.reduce((inner, quantity) => inner + quantity, 0), 0), 75);
});

test("Demo handoff overlay theo khoa nhưng không lẫn NORMAL và Sonde", () => {
  const reports = mergeHandoffReports([
    { departmentId: "khoa-noi", lines: [{ dietTypeId: "normal-com", quantity: 33 }] },
    { departmentId: "khoa-ngoai", lines: [{ dietTypeId: "normal-com", quantity: 42 }] },
  ], [
    { departmentId: "khoa-noi", lines: [{ dietTypeId: "normal-com", quantity: 30 }, { dietTypeId: "sonde-chao", quantity: 99 }] },
  ], new Set(["normal-com"]));

  assert.deepEqual(buildHandoffSnapshots({
    route: "NORMAL",
    dietStatuses: ["PREPARED"],
    reports,
    additions: [],
  }, "NORMAL"), [
    { departmentId: "khoa-ngoai", quantity: 42 },
    { departmentId: "khoa-noi", quantity: 30 },
  ]);
});
