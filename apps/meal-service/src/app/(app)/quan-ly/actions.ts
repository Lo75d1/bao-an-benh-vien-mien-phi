"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ManagementStatus } from "@/lib/management";
import { additionKindFor, normalizeAdditionReason } from "@/lib/late-addition";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";

const EDITABLE_MILESTONES = new Set<ManagementStatus>(["LOCKED", "PREPARING", "PREPARED", "SERVED"]);

async function adminActionText() {
  const locale = await readLocale();
  return getTranslations(locale).management.adminAction;
}

export async function addAdminKitchenMilestoneAction(formData: FormData) {
  const t = await adminActionText();
  const actor = await getSessionUser();
  if (!actor || actor.role !== "ADMIN") throw new Error(t.onlyAdminMilestone);
  if (actor.demoSessionId) throw new Error(t.demoMilestoneBlocked);

  const mealEventId = String(formData.get("mealEventId") ?? "");
  const departmentId = String(formData.get("departmentId") ?? "");
  const status = String(formData.get("status") ?? "") as ManagementStatus;
  const occurredAt = new Date(String(formData.get("occurredAt") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!mealEventId || !departmentId || !EDITABLE_MILESTONES.has(status)) throw new Error(t.invalidMilestone);
  if (Number.isNaN(occurredAt.getTime())) throw new Error(t.invalidTime);
  if (occurredAt.getTime() > Date.now()) throw new Error(t.futureMilestone);
  if (reason.length < 5 || reason.length > 500) throw new Error(t.invalidReason);

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
    if (dietMeals.length === 0) throw new Error(t.invalidReport);

    const existing = await tx.auditLog.findMany({
      where: { entityType: "DietMeal", entityId: { in: dietMeals.map((meal) => meal.id) }, action: { in: ["KITCHEN_STATUS_CHANGE", "ADMIN_KITCHEN_MILESTONE_ADD"] } },
      select: { entityId: true, afterJson: true },
    });
    const completed = new Set(existing.flatMap((log) => {
      const after = log.afterJson && typeof log.afterJson === "object" && !Array.isArray(log.afterJson) ? log.afterJson as Record<string, unknown> : null;
      return after?.status === status ? [log.entityId] : [];
    }));
    const missing = dietMeals.filter((meal) => !completed.has(meal.id));
    if (missing.length === 0) throw new Error(t.duplicateMilestone);

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

export async function createAdminAdditionAction(formData: FormData) {
  const t = await adminActionText();
  const actor = await getSessionUser();
  if (!actor || actor.role !== "ADMIN") throw new Error(t.onlyAdminAddition);
  if (actor.demoSessionId) throw new Error(t.demoAdditionBlocked);
  const mealEventId = String(formData.get("mealEventId") ?? ""); const departmentId = String(formData.get("departmentId") ?? ""); const dietMealId = String(formData.get("dietMealId") ?? ""); const quantity = Number(formData.get("quantity")); const reason = normalizeAdditionReason(formData.get("reason"));
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(t.invalidQuantity);
  await prisma.$transaction(async (tx) => {
    const [department, meal] = await Promise.all([tx.department.findFirst({ where: { id: departmentId, status: "ACTIVE" }, select: { id: true } }), tx.dietMeal.findFirst({ where: { id: dietMealId, mealEventId, voidedAt: null }, select: { id: true, dietTypeId: true, status: true, servingsPlanned: true } })]);
    if (!department || !meal) throw new Error(t.invalidDepartmentOrDiet);
    const kind = additionKindFor(meal.status);
    const addition = await tx.lateMealAddition.create({ data: { mealEventId, departmentId, dietTypeId: meal.dietTypeId, quantity, reason, kind, submittedById: actor.id } });
    await tx.auditLog.create({ data: { entityType: "LateMealAddition", entityId: addition.id, action: "ADMIN_CREATE", actorId: actor.id, actorName: actor.displayName, afterJson: { mealEventId, departmentId, dietTypeId: meal.dietTypeId, quantity, reason, kind, ackStatus: "PENDING", originalServings: meal.servingsPlanned }, reason: `Admin nhập phát sinh thay khoa: ${reason}` } });
  });
  revalidatePath("/quan-ly"); revalidatePath("/bep"); revalidatePath("/bao-suat");
}
