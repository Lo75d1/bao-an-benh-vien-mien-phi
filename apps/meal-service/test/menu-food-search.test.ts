import assert from "node:assert/strict";
import test from "node:test";
import { dishToMenuItems, type DishResult } from "../src/components/nutrition-2598/types";

test("thêm món vẫn giữ nguyên liệu chưa liên kết và không bịa dinh dưỡng", () => {
  const dish: DishResult = {
    id: "dish-1",
    name: "Cháo kiểm thử",
    totalWeightG: 35,
    servingUnit: null,
    ingredients: [
      { id: "ingredient-1", foodNameRaw: "Gạo chưa liên kết", quantityG: 35, food: null },
    ],
  };

  const [item] = dishToMenuItems(dish);
  assert.equal(item.itemName, "Gạo chưa liên kết");
  assert.equal(item.dishName, "Cháo kiểm thử");
  assert.equal(item.grams, 35);
  assert.equal(item.foodId, null);
  assert.equal(item.nutrients.energyKcal, null);
});
