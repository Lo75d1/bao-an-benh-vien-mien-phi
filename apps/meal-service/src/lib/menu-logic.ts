import { evaluateDiet, type DietCodeThresholds } from "@suat-an/nutrition-engine";

export const NUTRIENT_KEYS = ["energyKcal", "proteinG", "lipidG", "glucidG", "sodiumMg", "potassiumMg", "waterG"] as const;
export type MenuNutrientKey = (typeof NUTRIENT_KEYS)[number];
export type MenuItemInput = { foodId: string | null; itemName: string; dishName?: string; category?: string; note?: string; grams: number; wastePercent: number | null; nutrients: Record<MenuNutrientKey, number | null> };
export type MenuSnapshot = { version: 2; items: Array<{ foodId: string | null; itemName: string; dishName: string; category?: string; note?: string; grams: number; wastePercent: number | null }> };

export function calculateMenuTotals(items: MenuItemInput[]) {
  return Object.fromEntries(NUTRIENT_KEYS.map((key) => {
    let total = 0;
    for (const item of items) { const value = item.nutrients[key]; if (value === null || !Number.isFinite(value)) return [key, null]; total += value * item.grams / 100; }
    return [key, Number(total.toFixed(2))];
  })) as Record<MenuNutrientKey, number | null>;
}
export function evaluateMenu(items: MenuItemInput[], thresholds: DietCodeThresholds | null) { return evaluateDiet({ ...calculateMenuTotals(items), meals: 1 }, thresholds); }
export function createMenuSnapshot(items: MenuItemInput[]): MenuSnapshot { return { version: 2, items: items.map(({ foodId, itemName, dishName, category, note, grams, wastePercent }) => ({ foodId, itemName, dishName: dishName?.trim() || "Món 1", ...(category?.trim() ? { category: category.trim() } : {}), ...(note?.trim() ? { note: note.trim() } : {}), grams, wastePercent })) }; }
export function parseMenuItems(value: unknown): MenuSnapshot["items"] { if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return []; return value.items.flatMap((item) => { if (!item || typeof item !== "object") return []; const row = item as Record<string, unknown>; if (typeof row.itemName !== "string" || typeof row.grams !== "number") return []; return [{ foodId: typeof row.foodId === "string" ? row.foodId : null, itemName: row.itemName, dishName: typeof row.dishName === "string" && row.dishName.trim() ? row.dishName : "Món 1", ...(typeof row.category === "string" && row.category.trim() ? { category: row.category.trim() } : {}), ...(typeof row.note === "string" && row.note.trim() ? { note: row.note.trim() } : {}), grams: row.grams, wastePercent: typeof row.wastePercent === "number" ? row.wastePercent : null }]; }); }
