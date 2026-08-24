import { NUTRIENT_KEYS, type MenuNutrientKey } from "./menu-logic";

export type ImportField = "dietCode" | "mealName" | "dishName" | "foodName" | "grams" | MenuNutrientKey;
export type ImportColumnMap = Partial<Record<ImportField, number>>;
export type ImportPreviewRow = {
  rowNumber: number;
  dietCode: string;
  mealName: string;
  dishName: string;
  foodName: string;
  grams: number | null;
  nutrients: Record<MenuNutrientKey, number | null>;
  warnings: string[];
};

const aliases: Record<ImportField, string[]> = {
  dietCode: ["ma", "ma che do", "ma che do an", "diet code", "dietcode"],
  mealName: ["bua", "bua an", "meal", "meal type", "mealtype"],
  dishName: ["kieu mon", "loai mon", "ten mon", "mon an", "dish", "dish name"],
  foodName: ["ten thuc pham", "thuc pham", "nguyen lieu", "food", "food name"],
  grams: ["gram suat", "gram sach suat", "khoi luong", "so luong g", "gram", "grams", "g suat"],
  energyKcal: ["nang luong", "nang luong kcal", "kcal", "energy", "energy kcal"],
  proteinG: ["dam", "protein", "protein g"],
  lipidG: ["beo", "lipid", "fat", "lipid g"],
  glucidG: ["bot duong", "glucid", "carbohydrate", "carb", "glucid g"],
  sodiumMg: ["natri", "sodium", "sodium mg"],
  potassiumMg: ["kali", "potassium", "potassium mg"],
  waterG: ["nuoc", "water", "water g"],
};

export function normalizeImportText(value: unknown) {
  return String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function detectImportColumns(headers: unknown[]): ImportColumnMap {
  const normalized = headers.map(normalizeImportText);
  const mapping: ImportColumnMap = {};
  for (const [field, names] of Object.entries(aliases) as Array<[ImportField, string[]]>) {
    const index = normalized.findIndex((header) => names.some((name) => header === name || header.includes(name)));
    if (index >= 0) mapping[field] = index;
  }
  return mapping;
}

function textAt(row: unknown[], index: number | undefined) { return index === undefined ? "" : String(row[index] ?? "").trim(); }
function numberAt(row: unknown[], index: number | undefined) {
  if (index === undefined || row[index] === null || row[index] === undefined || row[index] === "") return null;
  const value = typeof row[index] === "number" ? row[index] : Number(String(row[index]).replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function parseImportRows(rows: unknown[][], mapping: ImportColumnMap, firstDataRow = 2): ImportPreviewRow[] {
  return rows.flatMap((row, index) => {
    const foodName = textAt(row, mapping.foodName);
    const dietCode = textAt(row, mapping.dietCode);
    const grams = numberAt(row, mapping.grams);
    if (!foodName && !dietCode && grams === null) return [];
    const warnings: string[] = [];
    if (!dietCode) warnings.push("Chưa chọn mã chế độ ăn");
    if (!foodName) warnings.push("Thiếu tên thực phẩm");
    if (grams === null || grams <= 0) warnings.push("Khối lượng phải lớn hơn 0");
    return [{
      rowNumber: firstDataRow + index,
      dietCode,
      mealName: textAt(row, mapping.mealName),
      dishName: textAt(row, mapping.dishName) || "Món 1",
      foodName,
      grams,
      nutrients: Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, numberAt(row, mapping[key])])) as Record<MenuNutrientKey, number | null>,
      warnings,
    }];
  });
}

export const requiredImportFields: ImportField[] = ["dietCode", "dishName", "foodName", "grams"];
