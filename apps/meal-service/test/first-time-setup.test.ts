import assert from "node:assert/strict";
import test from "node:test";
import { buildBeforeCommit, parseSetupCompletion, validateSetupInventory, type SetupInventory } from "../src/lib/first-time-setup";

const valid: SetupInventory = {
  adminValid: true,
  activeDepartments: 1,
  activeNursesWithDepartment: 1,
  activeKitchenByRoute: { NORMAL: 1, SONDE: 0 },
  menuEditors: 1,
  activeDietTypesByRoute: { NORMAL: 1, SONDE: 0 },
  activeMealTypesByRoute: { NORMAL: 1, SONDE: 0 },
  invalidMealTimes: [],
  sondeEnabled: false,
};

const codes = (input: SetupInventory) => validateSetupInventory(input).map((item) => item.code);

test("dữ liệu seed không tự được xem là setupComplete", () => {
  assert.equal(parseSetupCompletion(null), null);
  assert.equal(parseSetupCompletion({ departments: 2, mealTypes: 11 }), null);
  assert.deepEqual(parseSetupCompletion({ completedAt: "2026-08-29T00:00:00.000Z", completedById: "admin-1", version: 1 }), { completedAt: "2026-08-29T00:00:00.000Z", completedById: "admin-1", version: 1 });
});

test("thiếu khoa, Điều dưỡng hoặc Bếp NORMAL thì không hoàn tất", () => {
  assert.ok(codes({ ...valid, activeDepartments: 0 }).includes("DEPARTMENT"));
  assert.ok(codes({ ...valid, activeNursesWithDepartment: 0 }).includes("NURSE"));
  assert.ok(codes({ ...valid, activeKitchenByRoute: { NORMAL: 0, SONDE: 0 } }).includes("KITCHEN_NORMAL"));
});

test("Sonde bật bắt buộc đủ Bếp, mã chế độ và cữ Sonde", () => {
  const result = codes({ ...valid, sondeEnabled: true });
  assert.ok(result.includes("KITCHEN_SONDE"));
  assert.ok(result.includes("DIET_SONDE"));
  assert.ok(result.includes("MEAL_SONDE"));
});

test("Sonde tắt không bắt buộc dữ liệu Sonde", () => {
  assert.deepEqual(validateSetupInventory(valid), []);
});

test("Admin không hợp lệ và giờ bữa sai bị chặn", () => {
  const result = codes({ ...valid, adminValid: false, invalidMealTimes: ["Trưa"] });
  assert.ok(result.includes("ADMIN"));
  assert.ok(result.includes("MEAL_TIME"));
});

test("XLSX phải dựng xong trước khi commit", async () => {
  const order: string[] = [];
  const artifact = await buildBeforeCommit(async () => { order.push("xlsx"); return Buffer.from("PK"); }, async () => { order.push("commit"); });
  assert.equal(artifact.toString(), "PK");
  assert.deepEqual(order, ["xlsx", "commit"]);
});

test("XLSX lỗi thì không commit setup/password", async () => {
  let committed = false;
  await assert.rejects(
    buildBeforeCommit(async () => { throw new Error("xlsx failed"); }, async () => { committed = true; }),
    /xlsx failed/,
  );
  assert.equal(committed, false);
});
