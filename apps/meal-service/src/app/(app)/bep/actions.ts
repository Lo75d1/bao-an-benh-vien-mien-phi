"use server";
import type { DietMealStatus, EvidenceKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  completeKitchenEvent,
  saveFoodRetentionEvidence,
  reopenKitchenEvent,
  storeMealEvidence,
  transitionDietMeal,
} from "@/lib/kitchen";
import { acknowledgeLateMealAddition } from "@/lib/late-addition";
import { isKitchenPreparationOpen } from "@/lib/meal-events";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";
import { readActionClock } from "@/lib/request-clock";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";
import { readDemoSession } from "@/lib/demo-session";

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
  const demoAddition = input.additionId
    ? (await readDemoSession())?.state.additions.find((item) => item.id === input.additionId)
    : null;
  if (demoAddition && demoAddition.feedingRoute !== kitchenRoute)
    throw new Error("Suất bổ sung không thuộc phạm vi bếp đang thao tác.");
  const event = await prisma.mealEvent.findFirst({
    where: {
      ...(demoAddition ? { id: demoAddition.mealEventId } : {}),
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
      ...(input.additionId && !demoAddition
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
      mealType: { select: { id: true, cutoffTime: true, serviceTime: true } },
    },
  });
  if (!event) throw new Error("Không tìm thấy bữa ăn đang xử lý.");
  const settings = await readOperationalSettings();
  const clock = await readActionClock();
  if (
    !isKitchenPreparationOpen(
      event.mealDate,
      event.mealType.cutoffTime,
      event.mealType.serviceTime,
      clock.now,
      settings.serviceCompletionMinutes,
    )
  )
    throw new Error(
      `Bếp chỉ được thao tác từ giờ chuẩn bị ${event.mealType.cutoffTime}.`,
    );
}
export async function transitionMealAction(formData: FormData) {
  const user = await requireKitchen();
  if (user.demoSessionId) throw new Error("Dùng checklist xác nhận sẵn sàng trong Demo Session.");
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
  "STOCK_IN",
  "INVOICE",
]);
export async function uploadEvidenceAction(formData: FormData) {
  const user = await requireKitchen();
  if (user.demoSessionId) throw new Error("Dùng luồng ảnh món trong checklist Demo.");
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

async function completeKitchenEventSubmission(formData: FormData) {
  const user = await requireKitchen();
  const eventId = String(formData.get("eventId") ?? "");
  const mealIds = formData.getAll("dietMealId").map(String);
  await requirePreparationOpen({ eventId }, user.kitchenRoute!);
  const files = mealIds.map((dietMealId) => ({
    dietMealId,
    file: [formData.get(`library-${dietMealId}`), formData.get(`camera-${dietMealId}`)].find((value) => value instanceof File && value.size > 0),
    note:
      String(formData.get(`note-${dietMealId}`) ?? "")
        .trim()
        .slice(0, 500) || null,
  }));
  const uploads = files.filter((item): item is { dietMealId: string; file: File; note: string | null } => item.file instanceof File);
  const result = await completeKitchenEvent(
    {
      eventId,
      feedingRoute: user.kitchenRoute!,
      dietMealIds: mealIds,
      files: uploads,
    },
    user,
  );
  revalidatePath("/bep");
  revalidatePath("/lich");
  return result.stored;
}

export async function saveFoodRetentionAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!await getSessionUser()) redirect("/");
  try {
    const user = await requireKitchen();
    const eventId = String(formData.get("eventId") ?? "");
    await requirePreparationOpen({ eventId }, user.kitchenRoute!);
    const file = [formData.get("library-retention"), formData.get("camera-retention")].find((value) => value instanceof File && value.size > 0);
    if (!(file instanceof File)) throw new Error("Cần chụp hoặc chọn ảnh mẫu lưu 24 giờ.");
    const result = await saveFoodRetentionEvidence({ eventId, feedingRoute: user.kitchenRoute!, file, note: String(formData.get("retentionNote") ?? "").trim().slice(0, 500) || null }, user);
    revalidatePath("/bep"); revalidatePath("/lich"); revalidatePath("/quan-ly");
    return result.stored ? actionSuccess("Đã ghi nhận mẫu lưu 24 giờ cho toàn bữa.") : actionFailure(new Error("Không thể lưu ảnh vào bộ nhớ."));
  } catch (error) { return actionFailure(error); }
}

export async function completeKitchenEventAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!await getSessionUser()) redirect("/");
  try {
    const stored = await completeKitchenEventSubmission(formData);
    return stored ? actionSuccess("Đã lưu bằng chứng và xác nhận toàn bộ bữa đã chuẩn bị xong.") : actionFailure(new Error("Không thể lưu ảnh vào bộ nhớ. Dữ liệu chưa được xác nhận."));
  } catch (error) { return actionFailure(error); }
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
  if (user.demoSessionId) throw new Error("Demo Session không ghi xác nhận đọc vào dữ liệu nền.");
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
