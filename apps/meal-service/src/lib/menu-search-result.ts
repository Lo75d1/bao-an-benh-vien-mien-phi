import type { DishResult, FoodResult } from "@/components/nutrition-2598/types";
import type { MenuNutrientKey } from "./menu-logic";
import { nutritionSourceBadge } from "./nutrition-source";

const nutrientKeys: MenuNutrientKey[] = ["energyKcal", "proteinG", "lipidG", "glucidG", "sodiumMg", "potassiumMg", "waterG"];

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(number) ? number : null;
}

export function serializeFoodSearchResult(row: Record<string, unknown>): FoodResult {
  const source = typeof row.source === "string" ? row.source : null;
  return {
    id: String(row.id),
    name: String(row.name),
    source,
    sourceBadge: nutritionSourceBadge([source]),
    foodType: typeof row.foodType === "string" ? row.foodType : null,
    foodGroup: typeof row.foodGroup === "string" ? row.foodGroup : null,
    wastePercent: nullableNumber(row.wastePercent),
    ...Object.fromEntries(nutrientKeys.map((key) => [key, nullableNumber(row[key])])),
  } as FoodResult;
}

export function serializeDishSearchResult(row: Record<string, unknown>): DishResult {
  const ingredients = Array.isArray(row.ingredients) ? row.ingredients : [];
  const source = typeof row.source === "string" ? row.source : null;
  // This badge represents nutrition provenance contributing to the displayed search result,
  // not only the origin of the Dish master row itself.
  const ingredientSources = ingredients.map((value) => {
    const ingredient = value as Record<string, unknown>;
    const food = ingredient.food && typeof ingredient.food === "object" ? ingredient.food as Record<string, unknown> : null;
    return typeof food?.source === "string" ? food.source : null;
  });
  return {
    id: String(row.id),
    name: String(row.name),
    source,
    sourceBadge: nutritionSourceBadge([source, ...ingredientSources]),
    totalWeightG: nullableNumber(row.totalWeightG),
    servingUnit: typeof row.servingUnit === "string" ? row.servingUnit : null,
    ingredients: ingredients.map((value) => {
      const ingredient = value as Record<string, unknown>;
      return {
        id: String(ingredient.id),
        foodNameRaw: String(ingredient.foodNameRaw ?? ""),
        quantityG: nullableNumber(ingredient.quantityG) ?? 0,
        food: ingredient.food && typeof ingredient.food === "object" ? serializeFoodSearchResult(ingredient.food as Record<string, unknown>) : null,
      };
    }),
  };
}
