export type NutritionSource = string;

const SOURCE_ALIASES = new Map<string, NutritionSource>([
  ["RNI", "RNI"],
  ["VDD", "VDD"],
]);

const KNOWN_SOURCE_ORDER = new Map<NutritionSource, number>([
  ["RNI", 10],
  ["VDD", 20],
]);

export function normalizeNutritionSource(source: string | null | undefined): NutritionSource | null {
  const trimmed = source?.trim();
  if (!trimmed) return null;
  return SOURCE_ALIASES.get(trimmed.toUpperCase()) ?? trimmed;
}

export function collectNutritionSources(sources: Array<string | null | undefined>): NutritionSource[] {
  const normalized = new Map<NutritionSource, NutritionSource>();
  for (const source of sources) {
    const value = normalizeNutritionSource(source);
    if (value) normalized.set(value.toUpperCase(), value);
  }
  return [...normalized.values()].sort((left, right) => {
    const leftOrder = KNOWN_SOURCE_ORDER.get(left) ?? 1000;
    const rightOrder = KNOWN_SOURCE_ORDER.get(right) ?? 1000;
    return leftOrder - rightOrder || left.localeCompare(right);
  });
}

export function nutritionSourceBadge(sources: Array<string | null | undefined>): string | null {
  const collected = collectNutritionSources(sources);
  return collected.length ? collected.join(" + ") : null;
}
