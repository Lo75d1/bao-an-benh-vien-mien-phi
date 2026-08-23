"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ManagementStatus } from "@/lib/management";

const EDITABLE_MILESTONES = new Set<ManagementStatus>(["LOCKED", "PREPARING", "PREPARED", "SERVED"]);

export async function addAdminKitchenMilestoneAction(formData: FormData) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "ADMIN") throw new Error("Chỉ quản trị viên được bổ sung mốc còn thiếu.");

  const mealEventId = String(formData.get("mealEventId") ?? "");
  const departmentId = String(formData.get("departmentId") ?? "");
  const status = String(formData.get("status") ?? "") as ManagementStatus;
  const occurredAt = new Date(String(formData.get("occurredAt") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!mealEventId || !departmentId || !EDITABLE_MILESTONES.has(status)) throw new Error("Mốc cần bổ sung không hợp lệ.");
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Thời gian bổ sung không hợp lệ.");
  if (occurredAt.getTime() > Date.now()) throw new Error("Không thể bổ sung một mốc ở tương lai.");
  if (reason.length < 5 || reason.length > 500) throw new Error("Lý do cần từ 5 đến 500 ký tự.");

  await prisma.$transaction(async (tx) => {
    const event = await tx.mealEvent.findUnique({
      where: { id: mealEventId },
      select: {
        dietMeals: { where: { voidedAt: null, status: { not: "CANCELLED" } }, select: { id: true, dietTypeId: true } },
        reports: { where: { departmentId, status: "SUBMITTED" }, select: { lines: { select: { dietTypeId: true } } } },
      },
    });
    const reportedDietIds = new Set(event?.reports.flatMap((report) => report.lines.map((line) => line.dietTypeId)) ?? []);
    const dietMeals = event?.dietMeals.filter((meal) => reportedDietIds.has(meal.dietTypeId)) ?? [];
    if (dietMeals.length === 0) throw new Error("Khoa chưa có báo suất hợp lệ cho bữa này; admin không được báo thay.");

    const existing = await tx.auditLog.findMany({
      where: { entityType: "DietMeal", entityId: { in: dietMeals.map((meal) => meal.id) }, action: { in: ["KITCHEN_STATUS_CHANGE", "ADMIN_KITCHEN_MILESTONE_ADD"] } },
      select: { entityId: true, afterJson: true },
    });
    const completed = new Set(existing.flatMap((log) => {
      const after = log.afterJson && typeof log.afterJson === "object" && !Array.isArray(log.afterJson) ? log.afterJson as Record<string, unknown> : null;
      return after?.status === status ? [log.entityId] : [];
    }));
    const missing = dietMeals.filter((meal) => !completed.has(meal.id));
    if (missing.length === 0) throw new Error("Mốc này đã có dữ liệu, không thể ghi đè.");

    for (const meal of missing) {
      await tx.auditLog.create({ data: {
        entityType: "DietMeal",
        entityId: meal.id,
        action: "ADMIN_KITCHEN_MILESTONE_ADD",
        actorId: actor.id,
        actorName: actor.displayName,
        beforeJson: { status, occurredAt: null },
        afterJson: { status, occurredAt: occurredAt.toISOString(), note: reason, source: "ADMIN_MANUAL", mealEventId, departmentId },
        reason: `Bổ sung thủ công mốc bếp: ${reason}`,
      } });
    }
  });
  revalidatePath("/quan-ly");
}
