import assert from "node:assert/strict";
import test from "node:test";
import { countMissingDateDiet, countWarehouseVariances, knownCount } from "../src/lib/overview";

test("chỉ đếm một lần cho mỗi ngày và chế độ chưa có thực đơn", () => {
  const date = new Date("2026-08-21T00:00:00.000Z");
  assert.equal(countMissingDateDiet([{ mealDate: date, dietTypeId: "diet-1" }, { mealDate: date, dietTypeId: "diet-1" }, { mealDate: date, dietTypeId: "diet-2" }]), 2);
});

test("lệch kho chỉ đếm dòng có đủ số dự kiến và thực xuất cùng đơn vị gram", () => {
  const result = countWarehouseVariances(
    [{ foodId: "rice", rawGrams: 1000 }, { foodId: "fish", rawGrams: null }],
    [{ foodId: "rice", quantity: 1100, unit: "g" }, { foodId: "fish", quantity: 400, unit: "g" }, { foodId: null, quantity: 2, unit: "kg" }],
  );
  assert.equal(result, 1);
  assert.equal(countWarehouseVariances([{ foodId: "rice", rawGrams: null }], [{ foodId: "rice", quantity: 1000, unit: "g" }]), null);
});

test("không biến thiếu dữ liệu thành số 0", () => {
  assert.equal(knownCount(0, false), null);
  assert.equal(knownCount(0, true), 0);
});
