"use server";
import type { DietMealStatus, EvidenceKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  completeKitchenEvent,
  reopenKitchenEvent,
  storeMealEvidence,
  transitionDietMeal,
} from "@/lib/kitchen";
import { acknowledgeLateMealAddition } from "@/lib/late-addition";
import { isKitchenPreparationOpen } from "@/lib/meal-events";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";

async function requireKitchen() {
  const user = await getSessionUser();
  if (!user || user.role !== "KITCHEN" || !user.kitchenRoute)
    throw new Error(
      "Tài khoản bếp chưa được gán phạm vi Ăn thường hoặc Sonde.",
    );
  return user;
}
async function requirePreparationOpen(
  input: { eventId?: string; dietMealId?: string; additionId?: string },
  kitchenRoute: "NORMAL" | "SONDE",
) {
  const event = await prisma.mealEvent.findFirst({
    where: {
      ...(input.eventId
        ? {
            id: input.eventId,
            dietMeals: { some: { feedingRoute: kitchenRoute, voidedAt: null } },
          }
        : {}),
      ...(input.dietMealId
        ? {
            dietMeals: {
              some: {
                id: input.dietMealId,
                feedingRoute: kitchenRoute,
                voidedAt: null,
              },
            },
          }
        : {}),
      ...(input.additionId
        ? {
            additions: {
              some: {
                id: input.additionId,
                dietType: { feedingRoute: kitchenRoute },
              },
            },
          }
        : {}),
    },
    select: {
      mealDate: true,
      mealType: { select: { cutoffTime: true, serviceTime: true } },
    },
  });
  if (!event) throw new Error("Không tìm thấy bữa ăn đang xử lý.");
  const settings = await readOperationalSettings();
  if (
    !isKitchenPreparationOpen(
      event.mealDate,
      event.mealType.cutoffTime,
      event.mealType.serviceTime,
      new Date(),
      settings.serviceCompletionMinutes,
    )
  )
    throw new Error(
      `Bếp chỉ được thao tác từ giờ chuẩn bị ${event.mealType.cutoffTime}.`,
    );
}
export async function transitionMealAction(formData: FormData) {
  const user = await requireKitchen();
  const dietMealId = String(formData.get("dietMealId") ?? "");
  await requirePreparationOpen({ dietMealId }, user.kitchenRoute!);
  await transitionDietMeal(
    dietMealId,
    String(formData.get("target") ?? "") as DietMealStatus,
    user,
  );
  revalidatePath("/bep");
  revalidatePath("/lich");
  redirect("/bep?updated=status");
}
const EVIDENCE_KINDS = new Set<EvidenceKind>([
  "MEAL_PHOTO",
  "FOOD_SAMPLE",
  "STOCK_IN",
  "INVOICE",
]);
export async function uploadEvidenceAction(formData: FormData) {
  const user = await requireKitchen();
  const kind = String(formData.get("kind") ?? "") as EvidenceKind;
  const file = formData.get("file");
  const dietMealId = String(formData.get("dietMealId") ?? "");
  await requirePreparationOpen({ dietMealId }, user.kitchenRoute!);
  if (!EVIDENCE_KINDS.has(kind) || !(file instanceof File) || file.size === 0)
    throw new Error("Cần chọn loại và tệp ảnh hợp lệ.");
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)
    throw new Error("Chỉ nhận ảnh tối đa 10 MB.");
  const note =
    String(formData.get("note") ?? "")
      .trim()
      .slice(0, 500) || null;
  const result = await storeMealEvidence(
    { dietMealId, kind, file, note },
    user,
  );
  revalidatePath("/bep");
  redirect(
    result.stored ? "/bep?updated=evidence" : "/bep?storage=unavailable",
  );
}
export async function acknowledgeAdditionAction(formData: FormData) {
  const user = await requireKitchen();
  const additionId = String(formData.get("additionId") ?? "");
  await requirePreparationOpen({ additionId }, user.kitchenRoute!);
  await acknowledgeLateMealAddition(
    {
      additionId,
      ackStatus: String(
        formData.get("ackStatus") ?? "",
      ) as import("@prisma/client").AckStatus,
      kitchenNote: String(formData.get("kitchenNote") ?? "").trim() || null,
    },
    user,
  );
  revalidatePath("/bep");
  revalidatePath("/bao-suat");
  redirect("/bep?updated=addition");
}

export async function completeKitchenEventAction(formData: FormData) {
  const user = await requireKitchen();
  const eventId = String(formData.get("eventId") ?? "");
  const mealIds = formData.getAll("dietMealId").map(String);
  await requirePreparationOpen({ eventId }, user.kitchenRoute!);
  const files = mealIds.map((dietMealId) => ({
    dietMealId,
    file: formData.get(`file-${dietMealId}`),
    note:
      String(formData.get(`note-${dietMealId}`) ?? "")
        .trim()
        .slice(0, 500) || null,
  }));
  if (files.some((item) => !(item.file instanceof File)))
    throw new Error("Cần chọn ảnh cho tất cả mã chế độ ăn.");
  const result = await completeKitchenEvent(
    {
      eventId,
      feedingRoute: user.kitchenRoute!,
      files: files as Array<{
        dietMealId: string;
        file: File;
        note: string | null;
      }>,
    },
    user,
  );
  revalidatePath("/bep");
  revalidatePath("/lich");
  redirect(
    result.stored ? "/bep?updated=prepared" : "/bep?storage=unavailable",
  );
}
export async function reopenKitchenEventAction(formData: FormData) {
  const user = await requireKitchen();
  const eventId = String(formData.get("eventId") ?? "");
  await requirePreparationOpen({ eventId }, user.kitchenRoute!);
  await reopenKitchenEvent(eventId, user.kitchenRoute!, user);
  revalidatePath("/bep");
  revalidatePath("/lich");
  redirect("/bep?updated=reopened");
}
export async function acknowledgeKitchenNoteAction(formData: FormData) {
  const user = await requireKitchen();
  const noteId = String(formData.get("noteId") ?? "");
  await requirePreparationOpen({
    eventId: String(formData.get("eventId") ?? ""),
  }, user.kitchenRoute!);
  const note = await prisma.patientNote.findFirst({
    where: { id: noteId, status: "APPROVED" },
    select: { id: true },
  });
  if (!note) throw new Error("Không tìm thấy ghi chú đã duyệt.");
  await prisma.auditLog.create({
    data: {
      entityType: "PatientNote",
      entityId: note.id,
      action: "KITCHEN_READ",
      actorId: user.id,
      actorName: user.displayName,
      reason: "Bếp xác nhận đã đọc ghi chú",
    },
  });
  revalidatePath("/bep");
}
