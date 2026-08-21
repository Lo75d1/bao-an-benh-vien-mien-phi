"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLateMealAddition, normalizeAdditionReason } from "@/lib/late-addition";
import { normalizeServingNote, requireNurseDepartment, upsertServingReport, type ServingLineInput } from "@/lib/serving-report";

export async function saveServingReportAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const memberships = await prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true } });
  const departmentId = requireNurseDepartment(user.role, memberships.map((item) => item.departmentId));
  const mealEventId = String(formData.get("mealEventId") ?? "");
  const dietTypeIds = formData.getAll("dietTypeId").map(String);
  const lines: ServingLineInput[] = dietTypeIds.map((dietTypeId) => {
    const raw = String(formData.get(`quantity:${dietTypeId}`) ?? "").trim();
    if (!/^\d+$/.test(raw)) throw new Error("Cần nhập số suất nguyên không âm cho mọi chế độ.");
    return { dietTypeId, quantity: Number(raw), internalNote: normalizeServingNote(formData.get(`internalNote:${dietTypeId}`)), patientVisibleNote: normalizeServingNote(formData.get(`patientVisibleNote:${dietTypeId}`)) };
  });
  await upsertServingReport({ mealEventId, departmentId, lines }, user);
  revalidatePath("/bao-suat");
  revalidatePath("/lich");
  redirect("/bao-suat?saved=1");
}

export async function addLateMealAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const memberships = await prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true } });
  const departmentId = requireNurseDepartment(user.role, memberships.map((item) => item.departmentId));
  const rawQuantity = String(formData.get("quantity") ?? "").trim();
  if (!/^\d+$/.test(rawQuantity) || Number(rawQuantity) <= 0) throw new Error("Số suất bổ sung phải là số nguyên dương.");
  await createLateMealAddition({ mealEventId: String(formData.get("mealEventId") ?? ""), departmentId, dietTypeId: String(formData.get("dietTypeId") ?? ""), quantity: Number(rawQuantity), reason: normalizeAdditionReason(formData.get("reason")) }, user);
  revalidatePath("/bao-suat");
  revalidatePath("/bep");
  revalidatePath("/lich");
  redirect("/bao-suat?saved=addition");
}
