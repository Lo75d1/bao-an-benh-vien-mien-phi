"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLateMealAddition, normalizeAdditionReason } from "@/lib/late-addition";
import { confirmMealDelivery } from "@/lib/delivery-receipt";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { readActionClock } from "@/lib/request-clock";
import { reviewPatientNote } from "@/lib/patient-note";
import { normalizeReporterName, normalizeServingNote, requireNurseDepartment, saveServingReport, type ServingLineInput } from "@/lib/serving-report";

function nurseRedirect(formData: FormData, saved: string) {
  const route = formData.get("route") === "SONDE" ? "SONDE" : "NORMAL";
  redirect(`/bao-suat?route=${route}&saved=${saved}`);
}

async function actionTexts() {
  const locale = await readLocale();
  return getTranslations(locale).management.baoSuatAction;
}

async function saveServingReportSubmission(formData: FormData) {
  const t = await actionTexts();
  const user = await getSessionUser();
  if (!user) redirect("/");
  const memberships = await prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true } });
  const departmentId = requireNurseDepartment(user.role, memberships.map((item) => item.departmentId));
  const mealEventId = String(formData.get("mealEventId") ?? "");
  const dietTypeIds = formData.getAll("dietTypeId").map(String);
  const lines: ServingLineInput[] = dietTypeIds.map((dietTypeId) => {
    const raw = String(formData.get(`quantity:${dietTypeId}`) ?? "").trim();
    if (!/^\d+$/.test(raw)) throw new Error(t.invalidServingCount);
    return { dietTypeId, quantity: Number(raw), internalNote: normalizeServingNote(formData.get(`internalNote:${dietTypeId}`)), patientVisibleNote: normalizeServingNote(formData.get(`patientVisibleNote:${dietTypeId}`)) };
  });
  const clock = await readActionClock();
  await saveServingReport({ mealEventId, departmentId, reportedByName: normalizeReporterName(formData.get("reportedByName")), lines }, user, clock.now);
  revalidatePath("/bao-suat");
  revalidatePath("/lich");
}

async function addLateMeal(formData: FormData) {
  const t = await actionTexts();
  const user = await getSessionUser();
  if (!user) redirect("/");
  const memberships = await prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true } });
  const departmentId = requireNurseDepartment(user.role, memberships.map((item) => item.departmentId));
  const rawQuantity = String(formData.get("quantity") ?? "").trim();
  const feedingRoute = formData.get("route") === "SONDE" ? "SONDE" : "NORMAL";
  if (!/^\d+$/.test(rawQuantity) || Number(rawQuantity) <= 0) throw new Error(t.invalidAdditionCount);
  const clock = await readActionClock();
  await createLateMealAddition({ mealEventId: String(formData.get("mealEventId") ?? ""), departmentId, dietTypeId: String(formData.get("dietTypeId") ?? ""), feedingRoute, quantity: Number(rawQuantity), reason: normalizeAdditionReason(formData.get("reason")) }, user, clock.now);
  revalidatePath("/bao-suat");
  revalidatePath("/bep");
  revalidatePath("/lich");
}

export async function reviewPatientNoteAction(formData: FormData) {
  const t = await actionTexts();
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.demoSessionId) throw new Error(t.demoPatientNoteBlocked);
  const status = String(formData.get("status") ?? "");
  if (status !== "APPROVED" && status !== "REJECTED") throw new Error(t.invalidReviewStatus);
  await reviewPatientNote({ id: String(formData.get("noteId") ?? ""), status, reviewNote: formData.get("reviewNote") }, user);
  revalidatePath("/bao-suat");
  revalidatePath("/bep");
  nurseRedirect(formData, "patient-note");
}

async function confirmDeliveryReceipt(formData: FormData) {
  const t = await actionTexts();
  const user = await getSessionUser();
  if (!user) redirect("/");
  const memberships = await prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true } });
  const departmentId = requireNurseDepartment(user.role, memberships.map((item) => item.departmentId));
  const clock = await readActionClock();
  await confirmMealDelivery({ mealEventId: String(formData.get("mealEventId") ?? ""), departmentId, status: formData.get("status"), receivedQuantity: formData.get("receivedQuantity"), note: formData.get("note"), correctionReason: formData.get("correctionReason") }, user, clock.now);
  revalidatePath("/bao-suat");
  revalidatePath("/quan-ly");
  revalidatePath("/lich");
}

export async function saveServingReportAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!await getSessionUser()) redirect("/");
  try { await saveServingReportSubmission(formData); const t = await actionTexts(); return actionSuccess(t.servingSaved); }
  catch (error) { return actionFailure(error); }
}

export async function addLateMealAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!await getSessionUser()) redirect("/");
  try { await addLateMeal(formData); const t = await actionTexts(); return actionSuccess(t.additionSaved); }
  catch (error) { return actionFailure(error); }
}

export async function confirmDeliveryReceiptAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!await getSessionUser()) redirect("/");
  try {
    await confirmDeliveryReceipt(formData);
    const t = await actionTexts();
    return actionSuccess(formData.get("status") === "SHORT" ? t.receiptShortSaved : t.receiptFullSaved);
  } catch (error) { return actionFailure(error); }
}
