import assert from "node:assert/strict";
import test from "node:test";
import { assertNoHardDelete, inventoryVariance, parseWarehouseMode, warehouseKindForRoute } from "../src/lib/warehouse";

test("chênh lệch bằng thực xuất trừ dự kiến", () => {
  assert.equal(inventoryVariance(750, 810), 60);
  assert.equal(inventoryVariance(750, 700), -50);
  assert.equal(inventoryVariance(750, 750), 0);
  assert.equal(inventoryVariance(null, 750), null);
  assert.equal(inventoryVariance(750, undefined), null);
});

test("Mode B phân kho theo đường nuôi", () => {
  assert.equal(parseWarehouseMode({ mode: "B" }), "B");
  assert.equal(warehouseKindForRoute("B", "NORMAL"), "KITCHEN");
  assert.equal(warehouseKindForRoute("B", "SONDE"), "SONDE");
  assert.equal(warehouseKindForRoute("A", "SONDE"), "GENERAL");
});

test("không hard-delete giao dịch nghiệp vụ", () => {
  assert.throws(() => assertNoHardDelete("DELETE"), /không được xóa/i);
  assert.doesNotThrow(() => assertNoHardDelete("CANCEL"));
  assert.doesNotThrow(() => assertNoHardDelete("ADJUST"));
});
