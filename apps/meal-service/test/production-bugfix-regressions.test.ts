import assert from "node:assert/strict";
import test from "node:test";
import { hasActionableKitchenWork } from "../src/lib/kitchen";
import { pickActiveReportingMeal, pickOperationalMeal } from "../src/lib/meal-events";
import { hasMealBusinessData } from "../src/lib/meal-state";
import { detectImportColumns, parseImportRows } from "../src/lib/menu-excel-import";
import { serializeDishSearchResult, serializeFoodSearchResult } from "../src/lib/menu-search-result";

test("Bếp bỏ query bữa cũ và chọn bữa theo giờ vận hành hiện tại", () => {
  const meals = [
    { id: "sang", mealDate: new Date("2026-08-29T00:00:00.000Z"), cutoffTime: "05:00", serviceTime: "06:30", status: "PLANNED" as const },
    { id: "chieu", mealDate: new Date("2026-08-29T00:00:00.000Z"), cutoffTime: "14:00", serviceTime: "17:00", status: "PLANNED" as const },
  ];
  const now = new Date("2026-08-29T09:30:00.000Z"); // 16:30 Việt Nam
  assert.equal(pickOperationalMeal(meals, "sang", now)?.id, "chieu");
  assert.equal(pickOperationalMeal(meals, "chieu", now)?.id, "chieu");
});

test("lịch chỉ cho một bữa báo suất đang hoạt động trong ngày", () => {
  const mealDate = new Date("2026-08-29T00:00:00.000Z");
  const meals = [
    { id: "sang", mealDate, cutoffTime: "05:00", serviceTime: "06:30" },
    { id: "trua", mealDate, cutoffTime: "11:30", serviceTime: "12:30" },
    { id: "chieu", mealDate, cutoffTime: "17:00", serviceTime: "18:00" },
  ];
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-28T20:00:00.000Z"))?.id, "sang");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-28T22:30:00.000Z"))?.id, "sang");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-29T04:00:00.000Z"))?.id, "trua");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-29T07:30:00.000Z"))?.id, "chieu");
  assert.equal(pickActiveReportingMeal(meals, new Date("2026-08-29T12:30:00.000Z"))?.id ?? null, null);
});

test("lịch không ghim bữa của ngày tương lai thành báo suất hôm nay", () => {
  const now = new Date("2026-08-29T04:00:00.000Z");
  const todayMeal = { id: "today", mealDate: new Date("2026-08-29T00:00:00.000Z"), cutoffTime: "11:30", serviceTime: "12:30" };
  const tomorrowMeal = { id: "tomorrow", mealDate: new Date("2026-08-30T00:00:00.000Z"), cutoffTime: "11:30", serviceTime: "12:30" };
  assert.equal(pickActiveReportingMeal([tomorrowMeal], now), null);
});

test("không bao giờ có quá một bữa nhận báo đang hoạt động", () => {
  const meals = [
    { id: "sang", mealDate: new Date("2026-08-29T00:00:00.000Z"), cutoffTime: "05:00", serviceTime: "06:30" },
    { id: "trua", mealDate: new Date("2026-08-29T00:00:00.000Z"), cutoffTime: "11:30", serviceTime: "12:30" },
    { id: "chieu", mealDate: new Date("2026-08-29T00:00:00.000Z"), cutoffTime: "17:00", serviceTime: "18:00" },
  ];
  for (const now of [
    new Date("2026-08-28T20:00:00.000Z"),
    new Date("2026-08-29T00:30:00.000Z"),
    new Date("2026-08-29T04:00:00.000Z"),
    new Date("2026-08-29T07:30:00.000Z"),
    new Date("2026-08-29T12:30:00.000Z"),
  ]) {
    const active = pickActiveReportingMeal(meals, now);
    assert.ok(active === null || active.id.length > 0);
  }
});

test("khung lịch rỗng không bị coi là dữ liệu nghiệp vụ", () => {
  assert.equal(hasMealBusinessData({ dietStatuses: ["PLANNED", "CANCELLED"] }), false);
  assert.equal(hasMealBusinessData({ reportCount: 1, dietStatuses: ["PLANNED"] }), true);
  assert.equal(hasMealBusinessData({ menuItemCount: 1, dietStatuses: ["PLANNED"] }), true);
});

test("bữa không có suất hoặc phát sinh thực tế thì Bếp không có checklist", () => {
  assert.equal(hasActionableKitchenWork({ reportQuantities: [0, 0], additions: [] }), false);
  assert.equal(hasActionableKitchenWork({ reportQuantities: [3], additions: [] }), true);
  assert.equal(hasActionableKitchenWork({ reportQuantities: [0], additions: [{ quantity: 2, ackStatus: "PENDING" }] }), true);
  assert.equal(hasActionableKitchenWork({ reportQuantities: [0], additions: [{ quantity: 2, ackStatus: "REJECTED" }] }), false);
});

test("Excel dùng cột thứ hai làm tên món ăn, không dùng kiểu món", () => {
  const mapping = detectImportColumns(["Mã chế độ ăn", "Tên món ăn", "Tên thực phẩm", "Gram sạch/suất", "Kcal", "Đạm", "Bữa ăn"]);
  assert.deepEqual(mapping, { dietCode: 0, dishName: 1, foodName: 2, grams: 3, energyKcal: 4, proteinG: 5, mealName: 6 });
  const [row] = parseImportRows([["COM_THUONG", "Cơm — món chính", "Thịt heo", 80, 242, 27, "Trưa"]], mapping);
  assert.equal(row.dishName, "Cơm — món chính");
  assert.deepEqual(detectImportColumns(["Kiểu món", "Tên món ăn"]), { dishName: 1 });
});

test("kết quả tìm món và thực phẩm chuẩn hóa Decimal thành number", () => {
  const food = serializeFoodSearchResult({ id: "food-1", name: "Gạo tẻ", source: "VDD", energyKcal: "344.5", proteinG: "7.9", lipidG: null, glucidG: "76.2" });
  assert.equal(food.energyKcal, 344.5);
  assert.equal(food.proteinG, 7.9);
  assert.equal(food.lipidG, null);

  const dish = serializeDishSearchResult({
    id: "dish-1",
    name: "Cháo thịt",
    totalWeightG: "250",
    ingredients: [{ id: "ingredient-1", foodNameRaw: "Gạo", quantityG: "60", food: { id: "food-1", name: "Gạo", energyKcal: "344" } }],
  });
  assert.equal(dish.totalWeightG, 250);
  assert.equal(dish.ingredients[0]?.quantityG, 60);
  assert.equal(dish.ingredients[0]?.food?.energyKcal, 344);
});
