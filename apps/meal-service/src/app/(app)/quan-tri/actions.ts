"use server";

import type { ActiveStatus, DataSyncSource, FeedingRoute, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAccount, setAccountStatus, updateAccount } from "@/lib/accounts";
import { getSessionUser } from "@/lib/auth";
import { saveDietType, setDietTypeStatus } from "@/lib/diet-types";
import { saveDepartment, setDepartmentStatus } from "@/lib/departments";
import { saveMealType, setMealTypeStatus } from "@/lib/meal-types";
import { updateOperationalSettings } from "@/lib/settings";
import { readBrandingSettings, updateBrandingSettings } from "@/lib/branding";
import { createSyncPreview, queueSyncJob, retrySyncJob } from "@/lib/official-data-sync";

async function admin() { const user = await getSessionUser(); if (!user || user.role !== "ADMIN") throw new Error("Chỉ quản trị viên được thực hiện thao tác này."); return user; }
const enabled = (data: FormData, key: string) => ["on", "true", "1"].includes(String(data.get(key) ?? "").toLowerCase());

const DATA_SYNC_SOURCES = new Set<DataSyncSource>(["VDD_FOOD", "VDD_DISH", "RNI_DISH"]);

export async function previewOfficialDataAction(formData: FormData) {
  const actor = await admin();
  const source = String(formData.get("source") ?? "") as DataSyncSource;
  if (!DATA_SYNC_SOURCES.has(source)) throw new Error("Nguồn dữ liệu không hợp lệ.");
  const job = await createSyncPreview(source, actor);
  redirect(`/quan-tri?sync=${encodeURIComponent(job.id)}#official-data`);
}

export async function queueOfficialDataAction(formData: FormData) {
  const actor = await admin();
  await queueSyncJob(String(formData.get("jobId") ?? ""), String(formData.get("reason") ?? ""), actor);
  revalidatePath("/quan-tri");
  redirect("/quan-tri?updated=data-sync#official-data");
}

export async function retryOfficialDataAction(formData: FormData) {
  const actor = await admin();
  await retrySyncJob(String(formData.get("jobId") ?? ""), actor);
  revalidatePath("/quan-tri");
  redirect("/quan-tri?updated=data-sync#official-data");
}

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
  const heroFile = formData.get("publicHeroImage");
  let publicHeroImageDataUrl = formData.get("removePublicHeroImage") === "on" ? null : current.publicHeroImageDataUrl;
  if (heroFile instanceof File && heroFile.size > 0) {
    if (!new Set(["image/jpeg", "image/webp"]).has(heroFile.type)) throw new Error("Ảnh nền chỉ nhận JPG hoặc WebP.");
    if (heroFile.size > 1_500_000) throw new Error("Ảnh nền tối đa 1,5 MB.");
    publicHeroImageDataUrl = `data:${heroFile.type};base64,${Buffer.from(await heroFile.arrayBuffer()).toString("base64")}`;
  }
  await updateBrandingSettings({ organizationName: String(formData.get("organizationName") ?? ""), shortName: String(formData.get("shortName") ?? ""), primaryColor: String(formData.get("primaryColor") ?? ""), logoDataUrl, publicPrimaryColor: String(formData.get("publicPrimaryColor") ?? ""), publicAccentColor: String(formData.get("publicAccentColor") ?? ""), publicHeroEnabled: formData.get("publicHeroEnabled") === "on", publicHeroImageDataUrl }, actor, String(formData.get("reason") ?? ""));
  revalidatePath("/", "layout");
  redirect("/quan-tri?updated=branding#branding");
}

export async function saveSettingsAction(formData: FormData) {
  const actor = await admin();
  const ids = formData.getAll("mealTypeId").map(String);
  const cutoffs = formData.getAll("cutoffTime").map(String);
  const services = formData.getAll("serviceTime").map(String);
  await updateOperationalSettings({ dataStartDate: String(formData.get("dataStartDate") ?? ""), advanceEntryDays: Number(formData.get("advanceEntryDays")), publicMenuImages: enabled(formData, "publicMenuImages"), publicViewCountVisible: enabled(formData, "publicViewCountVisible"), sondeEnabled: enabled(formData, "sondeEnabled"), warehouseMode: formData.get("warehouseMode") === "B" ? "B" : "A", warehouseApprovalRole: String(formData.get("warehouseApprovalRole")) as Role, serviceCompletionMinutes: Number(formData.get("serviceCompletionMinutes")) }, ids.map((id, index) => ({ id, cutoffTime: cutoffs[index], serviceTime: services[index] })), actor, String(formData.get("reason") ?? ""));
  for (const path of ["/", "/quan-tri", "/lich", "/bao-suat", "/thuc-don", "/bep", "/quan-ly"]) revalidatePath(path);
  redirect("/quan-tri?updated=settings");
}

export async function saveAccountAction(formData: FormData) {
  const actor = await admin();
  const id = String(formData.get("userId") ?? "");
  const input = { email: formData.get("email"), displayName: formData.get("displayName"), role: formData.get("role"), password: formData.get("password"), departmentId: formData.get("departmentId"), kitchenRoute: formData.get("kitchenRoute") };
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

export async function saveDepartmentAction(formData: FormData) {
  const actor = await admin();
  const id = String(formData.get("departmentId") ?? "") || null;
  await saveDepartment(id, { code: formData.get("code"), name: formData.get("name") }, actor);
  for (const path of ["/quan-tri", "/quan-ly", "/bao-suat", "/lich"]) revalidatePath(path);
  redirect("/quan-tri?updated=department#departments");
}

export async function departmentStatusAction(formData: FormData) {
  const actor = await admin();
  await setDepartmentStatus(String(formData.get("departmentId")), formData.get("active") === "true", String(formData.get("reason") ?? ""), actor);
  for (const path of ["/quan-tri", "/quan-ly", "/bao-suat", "/lich"]) revalidatePath(path);
  redirect("/quan-tri?updated=department-status#departments");
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
  await saveMealType(id, { code: formData.get("code"), name: formData.get("name"), cutoffTime: formData.get("cutoffTime"), serviceTime: formData.get("serviceTime"), feedingRoute: formData.get("feedingRoute"), sortOrder: formData.get("sortOrder") }, actor);
  revalidatePath("/", "layout");
  redirect("/quan-tri?updated=meal");
}

export async function mealTypeStatusAction(formData: FormData) {
  const actor = await admin();
  await setMealTypeStatus(String(formData.get("mealTypeId")), formData.get("active") === "true", String(formData.get("reason") ?? ""), actor);
  revalidatePath("/", "layout");
  redirect("/quan-tri?updated=meal-status");
}
