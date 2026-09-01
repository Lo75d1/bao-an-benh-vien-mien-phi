import assert from "node:assert/strict";
import test from "node:test";
import { dishToMenuItems, type DishResult } from "../src/components/nutrition-2598/types";
import { serializeDishSearchResult, serializeFoodSearchResult } from "../src/lib/menu-search-result";
import { collectNutritionSources, nutritionSourceBadge } from "../src/lib/nutrition-source";

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

test("source badge mapping covers RNI VDD dual and missing provenance", () => {
  assert.equal(nutritionSourceBadge(["RNI"]), "RNI");
  assert.equal(nutritionSourceBadge(["VDD"]), "VDD");
  assert.equal(nutritionSourceBadge(["RNI", "VDD"]), "RNI + VDD");
  assert.equal(nutritionSourceBadge([null, ""]), null);
});

test("source collection deduplicates orders known sources and preserves future values", () => {
  assert.deepEqual(collectNutritionSources(["VDD", "RNI", "RNI", "USDA"]), ["RNI", "VDD", "USDA"]);
  assert.equal(nutritionSourceBadge(["USDA"]), "USDA");
  assert.equal(nutritionSourceBadge(["usda", "RNI"]), "RNI + usda");
  assert.equal(nutritionSourceBadge(["Open Food Facts", "VDD"]), "VDD + Open Food Facts");
});

test("food search result serializes source badge without changing nutrients", () => {
  const food = serializeFoodSearchResult({ id: "food-1", name: "Sữa tươi", source: "RNI", energyKcal: "66", proteinG: "3.2" });
  assert.equal(food.sourceBadge, "RNI");
  assert.equal(food.energyKcal, 66);
  assert.equal(food.proteinG, 3.2);
});

test("dish search result derives dual source from dish and ingredient records", () => {
  const dish = serializeDishSearchResult({
    id: "dish-1",
    name: "Cá hấp",
    source: "RNI",
    ingredients: [{ id: "i-1", foodNameRaw: "Cá", quantityG: "100", food: { id: "food-1", name: "Cá", source: "VDD" } }],
  });
  assert.equal(dish.sourceBadge, "RNI + VDD");
});

test("dish search result keeps future source values serializable without changing ordering inputs", () => {
  const dish = serializeDishSearchResult({
    id: "dish-3",
    name: "External source dish",
    source: "USDA",
    ingredients: [{ id: "i-1", foodNameRaw: "Milk", quantityG: "100", food: { id: "food-1", name: "Milk", source: "RNI" } }],
  });
  assert.equal(dish.sourceBadge, "RNI + USDA");
  assert.doesNotThrow(() => JSON.stringify(dish));
});

test("missing source does not block add-dish conversion", () => {
  const dish = serializeDishSearchResult({ id: "dish-2", name: "Món chưa nguồn", source: null, ingredients: [{ id: "i-1", foodNameRaw: "X", quantityG: 20, food: null }] });
  assert.equal(dish.sourceBadge, null);
  assert.equal(dishToMenuItems(dish)[0]?.foodId, null);
});
