import { buildKitchenShoppingList, type MealQuantity, type SnapshotMenuItem } from "@suat-an/nutrition-engine";
import type { DietMealStatus, EvidenceKind, Prisma } from "@prisma/client";
import { evidenceStorage } from "./evidence-storage";
import { prisma } from "./prisma";
import { servingTotal } from "./late-addition";
import { readApprovedKitchenNotes } from "./patient-note";

export const KITCHEN_STATUS_LABEL: Record<DietMealStatus, string> = { PLANNED: "Đã lên kế hoạch", LOCKED: "Đã chốt suất", PREPARING: "Đang chuẩn bị", PREPARED: "Đã chuẩn bị", SERVED: "Đã phục vụ", CANCELLED: "Đã hủy" };
const NEXT_STATUS: Partial<Record<DietMealStatus, DietMealStatus>> = { PLANNED: "PREPARING", LOCKED: "PREPARING", PREPARING: "PREPARED", PREPARED: "SERVED" };
export function nextKitchenStatus(status: DietMealStatus): DietMealStatus | null { return NEXT_STATUS[status] ?? null; }
export function assertKitchenTransition(from: DietMealStatus, to: DietMealStatus): void { if (nextKitchenStatus(from) !== to) throw new Error(`Không thể chuyển trạng thái từ ${from} sang ${to}.`); }

type CurrentSnapshot = { items?: unknown };
type CurrentItem = { foodId?: unknown; itemName?: unknown; grams?: unknown; wastePercent?: unknown };
export function buildDietMealShopping(input: Array<{ id: string; dietTypeId: string; dietName: string; servingsPlanned: number; menuSnapshotJson: unknown }>) {
  const menuItems: SnapshotMenuItem[] = []; const quantities: MealQuantity[] = []; const warnings: string[] = []; const mealTypeId = "kitchen-event";
  for (const meal of input) {
    if (!Number.isInteger(meal.servingsPlanned) || meal.servingsPlanned <= 0) { warnings.push(`${meal.dietName}: thiếu số suất hợp lệ; không tính số mua.`); continue; }
    quantities.push({ mealTypeId, dietTypeId: meal.dietTypeId, quantity: meal.servingsPlanned });
    const snapshot = meal.menuSnapshotJson as CurrentSnapshot | null;
    if (!snapshot || !Array.isArray(snapshot.items)) { warnings.push(`${meal.dietName}: chưa có snapshot thực đơn hợp lệ; số mua để “—”.`); continue; }
    const foods = (snapshot.items as CurrentItem[]).flatMap((item) => {
      const grams = Number(item?.grams); const name = typeof item?.itemName === "string" ? item.itemName : "Thực phẩm chưa xác định";
      if (typeof item?.foodId !== "string" || !item.foodId || typeof item.itemName !== "string" || !Number.isFinite(grams) || grams <= 0) { warnings.push(`${meal.dietName}: “${name}” thiếu liên kết thực phẩm hoặc khối lượng; số mua để “—”.`); return []; }
      return [{ foodId: item.foodId, foodName: item.itemName, gramsPerServing: grams, wastePercent: typeof item.wastePercent === "number" ? item.wastePercent : null }];
    });
    menuItems.push({ id: meal.id, dietTypeId: meal.dietTypeId, dishName: meal.dietName, snapshotJson: { dishes: [{ dish: meal.dietName, foods }] } });
  }
  const result = buildKitchenShoppingList("next-meal", mealTypeId, menuItems, quantities);
  return { ...result, incomplete: [...result.incomplete, ...warnings.map((reason) => ({ menuItemId: "", dishName: "Dữ liệu thiếu", reason }))] };
}

export async function readNextKitchenMeal() {
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const events = await prisma.mealEvent.findMany({ where: { mealDate: { gte: new Date(`${localDate}T00:00:00.000Z`) }, OR: [{ dietMeals: { some: { voidedAt: null, status: { notIn: ["SERVED", "CANCELLED"] } } } }, { additions: { some: { ackStatus: "PENDING" } } }] }, orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }], take: 14, include: { mealType: true, additions: { orderBy: { submittedAt: "desc" }, include: { department: true, dietType: true } }, dietMeals: { where: { voidedAt: null }, orderBy: { dietType: { sortOrder: "asc" } }, select: { id: true, dietTypeId: true, feedingRoute: true, menuSnapshotJson: true, servingsPlanned: true, status: true, dietType: true, evidence: { orderBy: { uploadedAt: "desc" } } } } } });
  const event = events[0] ?? null; if (!event) return null;
  const shopping = buildDietMealShopping(event.dietMeals.map((meal) => ({ id: meal.id, dietTypeId: meal.dietTypeId, dietName: meal.dietType.name, servingsPlanned: servingTotal(meal.servingsPlanned, event.additions.filter((addition) => addition.dietTypeId === meal.dietTypeId)).total, menuSnapshotJson: meal.menuSnapshotJson })));
  return { ...event, shopping, evidence: event.dietMeals.flatMap((meal) => meal.evidence.map((item) => ({ ...item, dietName: meal.dietType.name, publicUrl: evidenceStorage.publicUrl(item.storagePath) }))) };
}

export { readApprovedKitchenNotes };

export async function transitionDietMeal(dietMealId: string, target: DietMealStatus, actor: { id: string; displayName: string }) {
  return prisma.$transaction(async (tx) => { const meal = await tx.dietMeal.findUnique({ where: { id: dietMealId }, select: { id: true, status: true, voidedAt: true } }); if (!meal || meal.voidedAt) throw new Error("Không tìm thấy bữa ăn đang hoạt động."); assertKitchenTransition(meal.status, target); const updated = await tx.dietMeal.update({ where: { id: meal.id }, data: { status: target } }); await tx.auditLog.create({ data: { entityType: "DietMeal", entityId: meal.id, action: "KITCHEN_STATUS_CHANGE", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: meal.status }, afterJson: { status: target }, reason: `Bếp chuyển trạng thái ${meal.status} → ${target}` } }); return updated; });
}

export async function storeMealEvidence(input: { dietMealId: string; kind: EvidenceKind; file: File; note: string | null }, actor: { id: string; displayName: string }) {
  const stored = await evidenceStorage.store(input.file); if (!stored) return { stored: false as const };
  await prisma.$transaction(async (tx) => { const meal = await tx.dietMeal.findFirst({ where: { id: input.dietMealId, voidedAt: null }, select: { id: true } }); if (!meal) throw new Error("Không tìm thấy bữa ăn đang hoạt động."); const evidence = await tx.mealEvidence.create({ data: { dietMealId: meal.id, kind: input.kind, storagePath: stored.storagePath, uploadedById: actor.id, note: input.note } }); await tx.auditLog.create({ data: { entityType: "MealEvidence", entityId: evidence.id, action: "UPLOAD", actorId: actor.id, actorName: actor.displayName, afterJson: { dietMealId: meal.id, kind: input.kind, storagePath: stored.storagePath } as Prisma.InputJsonValue, reason: "Bếp đính kèm bằng chứng bữa ăn" } }); }); return { stored: true as const };
}
