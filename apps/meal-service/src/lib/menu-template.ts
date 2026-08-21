import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { MenuItemInput } from "./menu-logic";
import { normalizeMenuItems } from "./menu";

export function canDeleteMenuTemplate(usedByMealCount: number) { return usedByMealCount === 0; }

export async function createMenuTemplate(input: { name: string; dietTypeId?: string | null; feedingRoute?: "NORMAL" | "SONDE" | null; items: MenuItemInput[] }, actor: { id: string; displayName: string }) {
  const name = input.name.trim();
  if (!name || input.items.length === 0) throw new Error("Tên mẫu và ít nhất một thực phẩm là bắt buộc.");
  const items = await normalizeMenuItems(input.items);
  return prisma.$transaction(async (tx) => {
    const template = await tx.menuTemplate.create({ data: { ownerId: actor.id, name, dietTypeId: input.dietTypeId ?? null, feedingRoute: input.feedingRoute ?? null, items: { create: items.map((item) => ({ foodId: item.foodId, itemName: item.itemName.trim(), grams: item.grams, wastePercent: item.wastePercent })) } } });
    await tx.auditLog.create({ data: { entityType: "MenuTemplate", entityId: template.id, action: "CREATE", actorId: actor.id, actorName: actor.displayName, afterJson: { name, itemCount: input.items.length } as Prisma.InputJsonValue, reason: "Lưu thực đơn làm mẫu cá nhân" } });
    return template;
  });
}

export async function deleteMenuTemplate(templateId: string, actor: { id: string; displayName: string }) {
  return prisma.$transaction(async (tx) => {
    const template = await tx.menuTemplate.findFirst({ where: { id: templateId, ownerId: actor.id }, include: { _count: { select: { usedByMeals: true } } } });
    if (!template) throw new Error("Không tìm thấy mẫu cá nhân.");
    if (!canDeleteMenuTemplate(template._count.usedByMeals)) throw new Error("Không thể xóa mẫu đã được dùng cho thực đơn.");
    await tx.menuTemplate.delete({ where: { id: template.id } });
    await tx.auditLog.create({ data: { entityType: "MenuTemplate", entityId: template.id, action: "DELETE", actorId: actor.id, actorName: actor.displayName, beforeJson: { name: template.name } as Prisma.InputJsonValue, reason: "Xóa mẫu chưa từng được dùng" } });
  });
}
