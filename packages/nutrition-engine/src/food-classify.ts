import { normalizeVi } from "./normalize.js";
import type { Classify } from "./types.js";
export const EMPTY_CLASSIFY: Classify = { foodGroup: null, proteinOrigin: null, giLevel: null, purinLevel: null, cholesterolLevel: null };
export const CLASSIFY_SELECT_KEYS = ["foodGroup", "proteinOrigin", "giLevel", "purinLevel", "cholesterolLevel"] as const;
export function weightedLevelStat(rows: { grams: number; level: number | null }[]) { const total = rows.reduce((s, r) => s + r.grams, 0); const known = rows.filter(r => r.level !== null).reduce((s, r) => s + r.grams, 0); return { avg: known ? rows.reduce((s, r) => s + (r.level ?? 0) * (r.level === null ? 0 : r.grams), 0) / known : null, coveragePct: total ? known / total * 100 : 0 }; }
export function guessLipidOrigin(name: string, group: string | null): string { const text = normalizeVi(`${name} ${group ?? ""}`); if (/dau|hat|thuc vat/.test(text)) return "Dầu / thực vật"; if (/mo|thit|ca |trung|sua|hai san/.test(text)) return "Mỡ / động vật"; return "Chưa phân loại"; }
