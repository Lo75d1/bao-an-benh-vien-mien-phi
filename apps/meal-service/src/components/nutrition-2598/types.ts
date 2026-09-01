import type { MenuItemInput, MenuNutrientKey } from "@/lib/menu-logic";
export type FoodResult = { id: string; name: string; source: string | null; sourceBadge?: string | null; foodType: string | null; foodGroup: string | null; wastePercent: number | null } & Record<MenuNutrientKey, number | null>;
export type DishIngredientResult = { id: string; foodNameRaw: string; quantityG: number; food: FoodResult | null };
export type DishResult = { id: string; name: string; source?: string | null; sourceBadge?: string | null; totalWeightG: number | null; servingUnit: string | null; ingredients: DishIngredientResult[] };
export type DishNode = { dish: string; rows: MenuItemInput[] };

export function buildTree(rows: MenuItemInput[]): DishNode[] {
  const dishes = new Map<string, MenuItemInput[]>();
  for (const row of rows) {
    const name = row.dishName?.trim() || "Món 1";
    const current = dishes.get(name) ?? [];
    current.push(row);
    dishes.set(name, current);
  }
  return [...dishes].map(([dish, dishRows]) => ({ dish, rows: dishRows }));
}

export function foodToMenuItem(food: FoodResult, dishName: string, grams = 100): MenuItemInput {
  return { foodId: food.id, itemName: food.name, dishName, grams, wastePercent: food.wastePercent, nutrients: { energyKcal: food.energyKcal, proteinG: food.proteinG, lipidG: food.lipidG, glucidG: food.glucidG, sodiumMg: food.sodiumMg, potassiumMg: food.potassiumMg, waterG: food.waterG } };
}

const missingNutrients: Record<MenuNutrientKey, null> = { energyKcal: null, proteinG: null, lipidG: null, glucidG: null, sodiumMg: null, potassiumMg: null, waterG: null };

export function dishToMenuItems(dish: DishResult): MenuItemInput[] {
  return dish.ingredients.map((ingredient) => ingredient.food
    ? foodToMenuItem(ingredient.food, dish.name, ingredient.quantityG)
    : {
        foodId: null,
        itemName: ingredient.foodNameRaw.trim() || "Thực phẩm chưa liên kết",
        dishName: dish.name,
        grams: ingredient.quantityG,
        wastePercent: null,
        nutrients: { ...missingNutrients },
        note: `Chưa liên kết dữ liệu thực phẩm · Từ công thức: ${dish.name}`,
      });
}
