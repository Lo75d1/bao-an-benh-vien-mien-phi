import type { DietCodeThresholds } from "@suat-an/nutrition-engine";
import type { Prisma } from "@prisma/client";
import { mealTimePhase } from "./meal-events";
import { assessMenuDataQuality, createMenuSnapshot, evaluateMenu, NUTRIENT_KEYS, type MenuItemInput } from "./menu-logic";
import { prisma } from "./prisma";
import { normalizeLanguage, type Language } from "./i18n";
export * from "./menu-logic";

export function normalizeMenuPatientNote(value: unknown, language: Language = "vi"): string | null {
  if (typeof value !== "string") return null;
  const note = value.trim().replace(/\s+/g, " ");
  if (!note) return null;
  if (note.length > 500) throw new Error(language === "en" ? "Patient-visible notes are limited to 500 characters." : "Ghi chú dành cho bệnh nhân tối đa 500 ký tự.");
  return note;
}

export async function normalizeMenuItems(items: MenuItemInput[], language: Language = "vi"): Promise<MenuItemInput[]> {
  const foodIds = [...new Set(items.flatMap((item) => item.foodId ? [item.foodId] : []))];
  const foods = await prisma.food.findMany({ where: { id: { in: foodIds } }, select: { id: true, name: true, wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, sodiumMg: true, potassiumMg: true, waterG: true } });
  const byId = new Map(foods.map((food) => [food.id, food]));
  return items.map((item) => {
    const food = item.foodId ? byId.get(item.foodId) : null;
    if (item.foodId && !food) throw new Error(language === "en" ? "A selected food no longer exists in the reference data." : "Có thực phẩm không còn tồn tại trong dữ liệu nền.");
    const manualNutrients = Object.fromEntries(NUTRIENT_KEYS.map((key) => { const value = item.nutrients?.[key]; return [key, typeof value === "number" && Number.isFinite(value) ? value : null]; })) as MenuItemInput["nutrients"];
    return { foodId: food?.id ?? null, itemName: food?.name ?? item.itemName.trim(), dishName: item.dishName?.trim().slice(0, 120) || "Món 1", grams: item.grams, wastePercent: food?.wastePercent ?? item.wastePercent ?? null, nutrients: food ? { energyKcal: food.energyKcal, proteinG: food.proteinG, lipidG: food.lipidG, glucidG: food.glucidG, sodiumMg: food.sodiumMg, potassiumMg: food.potassiumMg, waterG: food.waterG } : manualNutrients };
  });
}

export async function saveDietMeal(input: { dietMealId: string; items: MenuItemInput[]; sourceTemplateId?: string | null; patientVisibleNote?: unknown }, actor: { id: string; displayName: string; language?: string | null }, now = new Date()) {
  const language = normalizeLanguage(actor.language);
  const message = (vi: string, en: string) => language === "en" ? en : vi;
  const meal = await prisma.dietMeal.findUnique({ where: { id: input.dietMealId }, include: { dietType: { include: { dietCodeRef: true } }, mealEvent: { include: { mealType: true } } } });
  if (!meal || meal.voidedAt) throw new Error(message("Không tìm thấy thực đơn đang hoạt động.", "The active menu could not be found."));
  if (mealTimePhase(meal.mealEvent.mealDate, meal.mealEvent.mealType.cutoffTime, meal.mealEvent.mealType.serviceTime, now) !== "BEFORE_CUTOFF") throw new Error(message("Đã tới giờ khóa thực đơn. Bếp đang dùng bản đã lưu gần nhất.", "The menu cutoff has passed. The Kitchen is using the latest saved version."));
  if (input.items.length === 0) throw new Error(message("Cần ít nhất một thực phẩm để lưu.", "Add at least one food before saving."));
  if (input.items.some((item) => !item.itemName.trim() || !Number.isFinite(item.grams) || item.grams <= 0)) throw new Error(message("Tên thực phẩm và gram phải hợp lệ.", "Food names and gram amounts must be valid."));
  const normalizedItems = await normalizeMenuItems(input.items, language);
  const quality = assessMenuDataQuality(normalizedItems);
  if (quality.level === "BLOCKED") throw new Error(language === "en" ? ({ "Chưa có thực phẩm trong mã chế độ ăn.": "This diet code has no foods.", "Tên thực phẩm và gram sạch/suất là dữ liệu thiết yếu.": "Food names and edible grams per serving are required.", "Không có năng lượng, đạm, béo hoặc bột đường để làm cơ sở đánh giá.": "Energy, protein, fat, or carbohydrate data is required for assessment." } as Record<string, string>)[quality.reasons[0]] ?? quality.reasons.join(" ") : quality.reasons.join(" "));
  if (input.sourceTemplateId) { const source = await prisma.menuTemplate.findFirst({ where: { id: input.sourceTemplateId, ownerId: actor.id }, select: { id: true } }); if (!source) throw new Error(message("Mẫu nguồn không thuộc kho cá nhân của bạn.", "The source template is not in your personal template library.")); }
  const thresholds = meal.dietType.dietCodeRef as DietCodeThresholds | null;
  const evaluation = evaluateMenu(normalizedItems, thresholds);
  const snapshot = createMenuSnapshot(normalizedItems);
  const patientVisibleNote = normalizeMenuPatientNote(input.patientVisibleNote, language);
  return prisma.$transaction(async (tx) => {
    const current = await tx.dietMeal.findUniqueOrThrow({ where: { id: meal.id }, include: { mealEvent: { include: { mealType: true } } } });
    if (mealTimePhase(current.mealEvent.mealDate, current.mealEvent.mealType.cutoffTime, current.mealEvent.mealType.serviceTime, now) !== "BEFORE_CUTOFF") throw new Error(message("Đã tới giờ khóa thực đơn. Bếp đang dùng bản đã lưu gần nhất.", "The menu cutoff has passed. The Kitchen is using the latest saved version."));
    const updated = await tx.dietMeal.update({ where: { id: meal.id }, data: { menuSnapshotJson: snapshot as unknown as Prisma.InputJsonValue, evaluationJson: evaluation as unknown as Prisma.InputJsonValue, patientVisibleNote, approvedAt: null, approvedById: actor.id, status: "PLANNED", sourceTemplateId: input.sourceTemplateId ?? null } });
    await tx.auditLog.create({ data: { entityType: "DietMeal", entityId: meal.id, action: "SAVE_MENU", actorId: actor.id, actorName: actor.displayName, beforeJson: { menuSnapshotJson: current.menuSnapshotJson, patientVisibleNote: current.patientVisibleNote } as unknown as Prisma.InputJsonValue, afterJson: { menuSnapshotJson: snapshot, evaluationJson: evaluation, patientVisibleNote, status: "PLANNED" } as unknown as Prisma.InputJsonValue, reason: "Lưu thực đơn và ghi chú công khai trước giờ tự động khóa" } });
    return updated;
  });
}
