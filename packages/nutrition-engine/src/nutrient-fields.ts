export type NutrientField = { key: string; label: string; unit: string };
export const CORE_CALC_FIELDS: NutrientField[] = [
  ["energyKcal", "Năng lượng", "kcal"], ["proteinG", "Đạm", "g"], ["lipidG", "Béo", "g"],
  ["glucidG", "Bột đường", "g"], ["fiberG", "Chất xơ", "g"], ["waterG", "Nước", "g"],
  ["calciumMg", "Canxi", "mg"], ["ironMg", "Sắt", "mg"], ["zincMg", "Kẽm", "mg"],
  ["sodiumMg", "Natri", "mg"], ["potassiumMg", "Kali", "mg"], ["magnesiumMg", "Magie", "mg"],
  ["phosphorusMg", "Phospho", "mg"], ["vitARaeMcg", "Vitamin A (RAE)", "µg"], ["vitCMg", "Vitamin C", "mg"],
  ["vitB1Mg", "Vitamin B1", "mg"], ["vitB2Mg", "Vitamin B2", "mg"], ["vitB3Mg", "Vitamin B3", "mg"]
].map(([key, label, unit]) => ({ key: key!, label: label!, unit: unit! }));
export const NUTRIENT_GROUPS = [{ title: "Chỉ tiêu tính khẩu phần", fields: CORE_CALC_FIELDS }];
export const ALL_NUTRIENT_FIELDS = NUTRIENT_GROUPS.flatMap((group) => group.fields);
