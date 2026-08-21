export type MetricStatus = "OK" | "LOW" | "HIGH" | "MISSING";
export type DietCriterion = { key: string; label: string; unit: string; status: MetricStatus; actual: number | null; min: number | null; max: number | null; target: string };
export type DietCodeThresholds = Record<string, number | null | undefined>;
const metrics = [
  ["energyKcal", "Năng lượng", "kcal"], ["proteinG", "Đạm", "g"], ["lipidG", "Béo", "g"], ["glucidG", "Bột đường", "g"],
  ["sodiumMg", "Natri", "mg"], ["potassiumMg", "Kali", "mg"], ["waterG", "Nước", "g"], ["meals", "Số bữa", "bữa"]
] as const;
export function evaluateDiet(totals: Record<string, number | null | undefined>, thresholds: DietCodeThresholds | null) {
  const criteria: DietCriterion[] = metrics.map(([key, label, unit]) => { const actual = typeof totals[key] === "number" ? totals[key]! : null; const min = thresholds && typeof thresholds[`${key}Min`] === "number" ? thresholds[`${key}Min`]! : null; const max = thresholds && typeof thresholds[`${key}Max`] === "number" ? thresholds[`${key}Max`]! : null; let status: MetricStatus = "OK"; if (actual === null || (min === null && max === null)) status = "MISSING"; else if (min !== null && actual < min) status = "LOW"; else if (max !== null && actual > max) status = "HIGH"; const target = min === null && max === null ? "—" : min === null ? `≤ ${max} ${unit}` : max === null ? `≥ ${min} ${unit}` : `${min}–${max} ${unit}`; return { key, label, unit, status, actual, min, max, target }; });
  return { overall: criteria.some(c => c.status === "MISSING") ? "WARN" : criteria.some(c => c.status === "LOW" || c.status === "HIGH") ? "FAIL" : "OK", criteria } as const;
}
