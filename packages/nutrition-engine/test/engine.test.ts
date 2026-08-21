import { describe, expect, it } from "vitest";
import { buildKitchenShoppingList, calculateQuantity, evaluateDiet, findRecommendation } from "../src/index.js";
describe("nutrition engine", () => {
  it("keeps missing waste data explicit", () => expect(calculateQuantity({ grams: 100, basis: "edible", wastePercent: null }).rawGrams).toBeNull());
  it("converts edible to purchasing grams", () => expect(calculateQuantity({ grams: 80, basis: "edible", wastePercent: 20 }).rawGrams).toBe(100));
  it("returns missing diet thresholds instead of invented zeroes", () => expect(evaluateDiet({ energyKcal: 1800 }, null).criteria.every(c => c.status === "MISSING")).toBe(true));
  it("matches recommendation by age", () => expect(findRecommendation([{ id: "1", ageGroup: "19-30 tuổi", gender: "Nam", physicalActivity: "Nhẹ" }], { gender: "Nam", physiology: "normal", ageYr: 25, ageMonth: 300, activityLevel: "light" })?.id).toBe("1"));
  it("aggregates kitchen quantities", () => { const result = buildKitchenShoppingList("m", "lunch", [{ id: "i", dietTypeId: "regular", dishName: "Cá", snapshotJson: { dishes: [{ dish: "Cá", foods: [{ foodId: "fish", foodName: "Cá", gramsPerServing: 80, wastePercent: 20 }] }] } }], [{ mealTypeId: "lunch", dietTypeId: "regular", quantity: 10 }]); expect(result.items[0]?.rawGrams).toBe(1000); });
});
