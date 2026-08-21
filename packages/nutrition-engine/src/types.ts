import type { QuantityBasis } from "./quantity.js";
export type Classify = { foodGroup: string | null; proteinOrigin: string | null; giLevel: number | null; purinLevel: number | null; cholesterolLevel: number | null };
export type RationRow = { uid: string; meal: string; dish: string; foodId: string; foodName: string; grams: number; inputGrams: number; inputBasis: QuantityBasis; conversionFactor: number; wastePercent: number | null; nutrients: Record<string, number | null>; classify: Classify };
export function buildTree(rows: RationRow[]) {
  const meals = new Map<string, Map<string, RationRow[]>>();
  for (const row of rows) { if (!row.foodId) continue; const dishes = meals.get(row.meal) ?? new Map(); const items = dishes.get(row.dish) ?? []; items.push(row); dishes.set(row.dish, items); meals.set(row.meal, dishes); }
  return [...meals].map(([meal, dishes]) => ({ meal, dishes: [...dishes].map(([dish, items]) => ({ dish, rows: items })) }));
}
