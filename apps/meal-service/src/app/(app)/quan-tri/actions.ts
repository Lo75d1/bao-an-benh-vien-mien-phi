"use server";

import type { ActiveStatus, FeedingRoute, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAccount, setAccountStatus, updateAccount } from "@/lib/accounts";
import { getSessionUser } from "@/lib/auth";
import { saveDietType, setDietTypeStatus } from "@/lib/diet-types";
import { saveMealType, setMealTypeStatus } from "@/lib/meal-types";
import { updateOperationalSettings } from "@/lib/settings";
import { readBrandingSettings, updateBrandingSettings } from "@/lib/branding";

async function admin() { const user = await getSessionUser(); if (!user || user.role !== "ADMIN") throw new Error("Chỉ quản trị viên được thực hiện thao tác này."); return user; }

export async function saveBrandingAction(formData: FormData) {
  const actor = await admin();
  const current = await readBrandingSettings();
  const file = formData.get("logo");
  let logoDataUrl = formData.get("removeLogo") === "on" ? null : current.logoDataUrl;
  if (file instanceof File && file.size > 0) {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) throw new Error("Logo chỉ nhận PNG, JPG hoặc WebP.");
    if (file.size > 300_000) throw new Error("Logo tối đa 300 KB.");
    logoDataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  }
  await updateBrandingSettings({ organizationName: String(formData.get("organizationName") ?? ""), shortName: String(formData.get("shortName") ?? ""), primaryColor: String(formData.get("primaryColor") ?? ""), logoDataUrl }, actor, String(formData.get("reason") ?? ""));
  revalidatePath("/", "layout");
  redirect("/quan-tri?updated=branding#branding");
}

export async function saveSettingsAction(formData: FormData) {
  const actor = await admin();
  const ids = formData.getAll("mealTypeId").map(String);
  const cutoffs = formData.getAll("cutoffTime").map(String);
  const services = formData.getAll("serviceTime").map(String);
  await updateOperationalSettings({ advanceEntryDays: Number(formData.get("advanceEntryDays")), publicMenuImages: formData.get("publicMenuImages") === "on", publicViewCountVisible: formData.get("publicViewCountVisible") === "on", sondeEnabled: formData.get("sondeEnabled") === "on", warehouseMode: formData.get("warehouseMode") === "B" ? "B" : "A", warehouseApprovalRole: String(formData.get("warehouseApprovalRole")) as Role, serviceCompletionMinutes: Number(formData.get("serviceCompletionMinutes")) }, ids.map((id, index) => ({ id, cutoffTime: cutoffs[index], serviceTime: services[index] })), actor, String(formData.get("reason") ?? ""));
  revalidatePath("/", "layout");
  redirect("/quan-tri?updated=settings");
}

export async function saveAccountAction(formData: FormData) {
  const actor = await admin();
  const id = String(formData.get("userId") ?? "");
  const input = { email: formData.get("email"), displayName: formData.get("displayName"), role: formData.get("role"), password: formData.get("password"), departmentId: formData.get("departmentId") };
  if (id) await updateAccount(id, input, actor); else await createAccount(input, actor);
  revalidatePath("/quan-tri");
  redirect(`/quan-tri?updated=${id ? "account" : "created"}`);
}

export async function accountStatusAction(formData: FormData) {
  const actor = await admin();
  await setAccountStatus(String(formData.get("userId")), String(formData.get("status")) as ActiveStatus, String(formData.get("reason") ?? ""), actor);
  revalidatePath("/quan-tri");
  redirect("/quan-tri?updated=status");
}

export async function saveDietTypeAction(formData: FormData) {
  const actor = await admin();
  const id = String(formData.get("dietTypeId") ?? "") || null;
  await saveDietType(id, { code: formData.get("code"), name: formData.get("name"), feedingRoute: formData.get("feedingRoute") as FeedingRoute, dietCodeRefId: formData.get("dietCodeRefId"), sortOrder: formData.get("sortOrder") }, actor);
  revalidatePath("/quan-tri"); revalidatePath("/lich");
  redirect("/quan-tri?updated=diet");
}

export async function dietTypeStatusAction(formData: FormData) {
  const actor = await admin();
  await setDietTypeStatus(String(formData.get("dietTypeId")), formData.get("active") === "true", String(formData.get("reason") ?? ""), actor);
  revalidatePath("/quan-tri"); revalidatePath("/lich");
  redirect("/quan-tri?updated=diet-status");
}

export async function saveMealTypeAction(formData: FormData) {
  const actor = await admin();
  const id = String(formData.get("mealTypeId") ?? "") || null;
  await saveMealType(id, { code: formData.get("code"), name: formData.get("name"), cutoffTime: formData.get("cutoffTime"), serviceTime: formData.get("serviceTime"), sortOrder: formData.get("sortOrder") }, actor);
  revalidatePath("/", "layout");
  redirect("/quan-tri?updated=meal");
}

export async function mealTypeStatusAction(formData: FormData) {
  const actor = await admin();
  await setMealTypeStatus(String(formData.get("mealTypeId")), formData.get("active") === "true", String(formData.get("reason") ?? ""), actor);
  revalidatePath("/", "layout");
  redirect("/quan-tri?updated=meal-status");
}
