import type { DietCodeThresholds } from "@suat-an/nutrition-engine";
import type { Prisma } from "@prisma/client";
import { mealTimePhase } from "./meal-events";
import { createMenuSnapshot, evaluateMenu, type MenuItemInput } from "./menu-logic";
import { prisma } from "./prisma";
export * from "./menu-logic";

export async function normalizeMenuItems(items: MenuItemInput[]): Promise<MenuItemInput[]> {
  const foodIds = [...new Set(items.flatMap((item) => item.foodId ? [item.foodId] : []))];
  const foods = await prisma.food.findMany({ where: { id: { in: foodIds } }, select: { id: true, name: true, wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, sodiumMg: true, potassiumMg: true, waterG: true } });
  const byId = new Map(foods.map((food) => [food.id, food]));
  return items.map((item) => { const food = item.foodId ? byId.get(item.foodId) : null; if (item.foodId && !food) throw new Error("Có thực phẩm không còn tồn tại trong dữ liệu nền."); return { foodId: food?.id ?? null, itemName: food?.name ?? item.itemName.trim(), dishName: item.dishName?.trim().slice(0, 120) || "Món 1", grams: item.grams, wastePercent: food?.wastePercent ?? null, nutrients: food ? { energyKcal: food.energyKcal, proteinG: food.proteinG, lipidG: food.lipidG, glucidG: food.glucidG, sodiumMg: food.sodiumMg, potassiumMg: food.potassiumMg, waterG: food.waterG } : { energyKcal: null, proteinG: null, lipidG: null, glucidG: null, sodiumMg: null, potassiumMg: null, waterG: null } }; });
}

export async function saveDietMeal(input: { dietMealId: string; items: MenuItemInput[]; sourceTemplateId?: string | null }, actor: { id: string; displayName: string }) {
  const meal = await prisma.dietMeal.findUnique({ where: { id: input.dietMealId }, include: { dietType: { include: { dietCodeRef: true } }, mealEvent: { include: { mealType: true } } } });
  if (!meal || meal.voidedAt) throw new Error("Không tìm thấy thực đơn đang hoạt động.");
  if (mealTimePhase(meal.mealEvent.mealDate, meal.mealEvent.mealType.cutoffTime, meal.mealEvent.mealType.serviceTime) !== "BEFORE_CUTOFF") throw new Error("Đã tới giờ khóa thực đơn. Bếp đang dùng bản đã lưu gần nhất.");
  if (input.items.length === 0) throw new Error("Cần ít nhất một thực phẩm để lưu.");
  if (input.items.some((item) => !item.itemName.trim() || !Number.isFinite(item.grams) || item.grams <= 0)) throw new Error("Tên thực phẩm và gram phải hợp lệ.");
  const normalizedItems = await normalizeMenuItems(input.items);
  if (input.sourceTemplateId) { const source = await prisma.menuTemplate.findFirst({ where: { id: input.sourceTemplateId, ownerId: actor.id }, select: { id: true } }); if (!source) throw new Error("Mẫu nguồn không thuộc kho cá nhân của bạn."); }
  const thresholds = meal.dietType.dietCodeRef as DietCodeThresholds | null;
  const evaluation = evaluateMenu(normalizedItems, thresholds);
  const snapshot = createMenuSnapshot(normalizedItems);
  return prisma.$transaction(async (tx) => {
    const current = await tx.dietMeal.findUniqueOrThrow({ where: { id: meal.id }, include: { mealEvent: { include: { mealType: true } } } });
    if (mealTimePhase(current.mealEvent.mealDate, current.mealEvent.mealType.cutoffTime, current.mealEvent.mealType.serviceTime) !== "BEFORE_CUTOFF") throw new Error("Đã tới giờ khóa thực đơn. Bếp đang dùng bản đã lưu gần nhất.");
    const updated = await tx.dietMeal.update({ where: { id: meal.id }, data: { menuSnapshotJson: snapshot as unknown as Prisma.InputJsonValue, evaluationJson: evaluation as unknown as Prisma.InputJsonValue, approvedAt: null, approvedById: actor.id, status: "PLANNED", sourceTemplateId: input.sourceTemplateId ?? null } });
    await tx.auditLog.create({ data: { entityType: "DietMeal", entityId: meal.id, action: "SAVE_MENU", actorId: actor.id, actorName: actor.displayName, beforeJson: current.menuSnapshotJson ?? undefined, afterJson: { menuSnapshotJson: snapshot, evaluationJson: evaluation, status: "PLANNED" } as unknown as Prisma.InputJsonValue, reason: "Lưu thực đơn trước giờ tự động khóa" } });
    return updated;
  });
}
