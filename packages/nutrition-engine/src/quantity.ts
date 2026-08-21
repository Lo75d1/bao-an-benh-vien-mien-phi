export type RationMode = "recall24h" | "menu";
export type QuantityBasis = "edible" | "raw";
export type QuantityInput = { grams: number; basis: QuantityBasis; conversionFactor?: number | null; wastePercent?: number | null };
export type QuantityResult = { inputGrams: number; conversionFactor: number; wastePercent: number | null; edibleGrams: number; rawGrams: number | null; conversionAvailable: boolean };
export const basisForMode = (_mode: RationMode): QuantityBasis => "edible";
export const isValidWastePercent = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 100;
export function calculateQuantity(input: QuantityInput): QuantityResult {
  const inputGrams = Number.isFinite(input.grams) && input.grams > 0 ? input.grams : 0;
  const conversionFactor = typeof input.conversionFactor === "number" && Number.isFinite(input.conversionFactor) && input.conversionFactor > 0 ? input.conversionFactor : 1;
  const converted = inputGrams * conversionFactor;
  const wastePercent = isValidWastePercent(input.wastePercent) ? input.wastePercent : null;
  if (input.basis === "raw") return { inputGrams, conversionFactor, wastePercent, edibleGrams: wastePercent === null ? converted : converted * (1 - wastePercent / 100), rawGrams: converted, conversionAvailable: true };
  return { inputGrams, conversionFactor, wastePercent, edibleGrams: converted, rawGrams: wastePercent === null ? null : converted / (1 - wastePercent / 100), conversionAvailable: wastePercent !== null };
}
