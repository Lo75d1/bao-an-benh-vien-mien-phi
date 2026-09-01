import { getSessionUser } from "@/lib/auth";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { prisma } from "@/lib/prisma";
import { dynamicCsv, flattenOfficialSource } from "@/lib/official-data-export";

const SOURCES = new Set(["VDD_FOOD", "VDD_DISH", "RNI_DISH"]);

export async function GET(request: Request) {
  const user = await getSessionUser();
  const t = getTranslations(await readLocale()).management.adminExport;
  if (!user || user.role !== "ADMIN") return new Response(t.forbidden, { status: 403 });
  const source = new URL(request.url).searchParams.get("source") ?? "";
  if (!SOURCES.has(source)) return new Response(t.invalidSource, { status: 400 });
  let rows: Array<Record<string, unknown>>;
  if (source === "VDD_FOOD") {
    const foods = await prisma.food.findMany({ where: { source: "VDD" }, orderBy: { name: "asc" }, select: { sourceCode: true, name: true, unit: true, foodType: true, foodGroup: true, wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, sodiumMg: true, potassiumMg: true, waterG: true, rawJson: true } });
    rows = foods.map((row) => ({ "Ma nguon": row.sourceCode, "Ten": row.name, "Don vi": row.unit, "Loai": row.foodType, "Nhom": row.foodGroup, "Thai bo %": row.wastePercent, "Nang luong kcal": row.energyKcal, "Dam g": row.proteinG, "Beo g": row.lipidG, "Bot duong g": row.glucidG, "Natri mg": row.sodiumMg, "Kali mg": row.potassiumMg, "Nuoc g": row.waterG, ...flattenOfficialSource(row.rawJson), "Du lieu goc JSON": JSON.stringify(row.rawJson) }));
  } else {
    const dishes = await prisma.dish.findMany({ where: { source: source === "VDD_DISH" ? "VDD" : "RNI" }, orderBy: { name: "asc" }, select: { sourceCode: true, name: true, totalWeightG: true, servingUnit: true, isActive: true, rawJson: true, ingredients: { orderBy: { sortOrder: "asc" }, select: { foodNameRaw: true, quantityG: true, energyKcalRaw: true, rawJson: true } } } });
    rows = dishes.flatMap((dish) => {
      const base = { "Ma nguon": dish.sourceCode, "Ten mon": dish.name, "Khoi luong mon g": dish.totalWeightG, "Don vi": dish.servingUnit, "Trang thai": dish.isActive ? "Dang dung" : "Ngung dung", ...flattenOfficialSource(dish.rawJson, "Nguon mon"), "Du lieu mon goc JSON": JSON.stringify(dish.rawJson) };
      return dish.ingredients.length ? dish.ingredients.map((ingredient) => ({ ...base, "Thuc pham": ingredient.foodNameRaw, "Khoi luong thuc pham g": ingredient.quantityG, "Nang luong nguyen lieu kcal": ingredient.energyKcalRaw, ...flattenOfficialSource(ingredient.rawJson, "Nguon nguyen lieu"), "Du lieu nguyen lieu goc JSON": JSON.stringify(ingredient.rawJson) })) : [base];
    });
  }
  return new Response(`\uFEFF${dynamicCsv(rows)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="du-lieu-day-du-${source.toLowerCase()}.csv"`, "Cache-Control": "private, no-store" } });
}
