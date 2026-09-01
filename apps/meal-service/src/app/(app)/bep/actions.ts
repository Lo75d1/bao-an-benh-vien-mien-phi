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
import { handoffMealEvent } from "@/lib/meal-handoff";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";

async function getActionTexts() {
  return getTranslations(await readLocale()).management.kitchenAction;
}

async function requireKitchen(t: Awaited<ReturnType<typeof getActionTexts>>) {
  const user = await getSessionUser();
  if (!user || user.role !== "KITCHEN" || !user.kitchenRoute)
    throw new Error(t.kitchenRouteRequired);
  return user;
}
async function requirePreparationOpen(
  input: { eventId?: string; dietMealId?: string; additionId?: string },
  kitchenRoute: "NORMAL" | "SONDE",
  t: Awaited<ReturnType<typeof getActionTexts>>,
) {
  const demoAddition = input.additionId
    ? (await readDemoSession())?.state.additions.find((item) => item.id === input.additionId)
    : null;
  if (demoAddition && demoAddition.feedingRoute !== kitchenRoute)
    throw new Error(t.additionWrongRoute);
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
  if (!event) throw new Error(t.mealNotFound);
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
    throw new Error(t.preparationNotOpen.replace("{cutoff}", event.mealType.cutoffTime));
}
export async function transitionMealAction(formData: FormData) {
  const t = await getActionTexts();
  const user = await requireKitchen(t);
  if (user.demoSessionId) throw new Error(t.demoUseCompletionFlow);
  const dietMealId = String(formData.get("dietMealId") ?? "");
  await requirePreparationOpen({ dietMealId }, user.kitchenRoute!, t);
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
  const t = await getActionTexts();
  const user = await requireKitchen(t);
  if (user.demoSessionId) throw new Error(t.demoUsePhotoChecklist);
  const kind = String(formData.get("kind") ?? "") as EvidenceKind;
  const file = formData.get("file");
  const dietMealId = String(formData.get("dietMealId") ?? "");
  await requirePreparationOpen({ dietMealId }, user.kitchenRoute!, t);
  if (!EVIDENCE_KINDS.has(kind) || !(file instanceof File) || file.size === 0)
    throw new Error(t.invalidEvidenceFile);
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)
    throw new Error(t.imageTooLarge);
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
  const t = await getActionTexts();
  const user = await requireKitchen(t);
  const additionId = String(formData.get("additionId") ?? "");
  await requirePreparationOpen({ additionId }, user.kitchenRoute!, t);
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
  const t = await getActionTexts();
  const user = await requireKitchen(t);
  const eventId = String(formData.get("eventId") ?? "");
  const mealIds = formData.getAll("dietMealId").map(String);
  await requirePreparationOpen({ eventId }, user.kitchenRoute!, t);
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
  const t = await getActionTexts();
  try {
    const user = await requireKitchen(t);
    const eventId = String(formData.get("eventId") ?? "");
    await requirePreparationOpen({ eventId }, user.kitchenRoute!, t);
    const file = [formData.get("library-retention"), formData.get("camera-retention")].find((value) => value instanceof File && value.size > 0);
    if (!(file instanceof File)) throw new Error(t.retentionImageRequired);
    const result = await saveFoodRetentionEvidence({ eventId, feedingRoute: user.kitchenRoute!, file, note: String(formData.get("retentionNote") ?? "").trim().slice(0, 500) || null }, user);
    revalidatePath("/bep"); revalidatePath("/lich"); revalidatePath("/quan-ly");
    return result.stored ? actionSuccess(t.retentionSaved) : actionFailure(new Error(t.storageFailed));
  } catch (error) { return actionFailure(error); }
}

export async function completeKitchenEventAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!await getSessionUser()) redirect("/");
  const t = await getActionTexts();
  try {
    const stored = await completeKitchenEventSubmission(formData);
    return stored ? actionSuccess(t.completionSaved) : actionFailure(new Error(t.completionStorageFailed));
  } catch (error) { return actionFailure(error); }
}

export async function handoffMealEventAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!await getSessionUser()) redirect("/");
  const t = await getActionTexts();
  try {
    const user = await requireKitchen(t);
    const handoffs = await handoffMealEvent({ mealEventId: String(formData.get("eventId") ?? ""), feedingRoute: user.kitchenRoute! }, user);
    revalidatePath("/bep"); revalidatePath("/bao-suat"); revalidatePath("/quan-ly"); revalidatePath("/lich");
    return actionSuccess(t.handoffSaved.replace("{count}", String(handoffs.length)));
  } catch (error) { return actionFailure(error); }
}
export async function reopenKitchenEventAction(formData: FormData) {
  const t = await getActionTexts();
  const user = await requireKitchen(t);
  const eventId = String(formData.get("eventId") ?? "");
  await requirePreparationOpen({ eventId }, user.kitchenRoute!, t);
  await reopenKitchenEvent(eventId, user.kitchenRoute!, user);
  revalidatePath("/bep");
  revalidatePath("/lich");
  redirect("/bep?updated=reopened");
}
export async function acknowledgeKitchenNoteAction(formData: FormData) {
  const t = await getActionTexts();
  const user = await requireKitchen(t);
  if (user.demoSessionId) throw new Error(t.demoNoteAckBlocked);
  const noteId = String(formData.get("noteId") ?? "");
  await requirePreparationOpen({
    eventId: String(formData.get("eventId") ?? ""),
  }, user.kitchenRoute!, t);
  const note = await prisma.patientNote.findFirst({
    where: { id: noteId, status: "APPROVED" },
    select: { id: true },
  });
  if (!note) throw new Error(t.approvedNoteNotFound);
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
