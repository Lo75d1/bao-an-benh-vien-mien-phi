"use server";

import type { ActiveStatus, FeedingRoute } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAccount, setAccountStatus, updateAccount } from "@/lib/accounts";
import { getSessionUser } from "@/lib/auth";
import { readBrandingSettings, updateBrandingSettings } from "@/lib/branding";
import { saveDepartment, setDepartmentStatus } from "@/lib/departments";
import { saveDietType, setDietTypeStatus } from "@/lib/diet-types";
import { completeFirstTimeSetup } from "@/lib/first-time-setup";
import { saveMealType, setMealTypeStatus } from "@/lib/meal-types";
import { readOperationalSettings, updateOperationalSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

async function admin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Chỉ Admin được thiết lập hệ thống.");
  return user;
}

const message = (error: unknown) => error instanceof Error ? error.message : "Không thể lưu thay đổi.";
function finish(step: number, error?: unknown) {
  revalidatePath("/thiet-lap-ban-dau");
  redirect(`/thiet-lap-ban-dau?step=${step}${error ? `&error=${encodeURIComponent(message(error))}` : ""}`);
}

export async function setupBrandingAction(formData: FormData) {
  const actor = await admin();
  try {
    const current = await readBrandingSettings();
    await updateBrandingSettings({ ...current, organizationName: String(formData.get("organizationName") ?? ""), shortName: String(formData.get("shortName") ?? ""), primaryColor: String(formData.get("primaryColor") ?? current.primaryColor) }, actor, "Xác nhận nhận diện trong thiết lập ban đầu");
  } catch (error) { finish(1, error); }
  finish(2);
}

export async function setupDepartmentAction(formData: FormData) {
  const actor = await admin();
  try { await saveDepartment(String(formData.get("departmentId") ?? "") || null, { code: formData.get("code"), name: formData.get("name") }, actor); }
  catch (error) { finish(2, error); }
  finish(2);
}

export async function setupDepartmentStatusAction(formData: FormData) {
  const actor = await admin();
  try { await setDepartmentStatus(String(formData.get("departmentId")), formData.get("active") === "true", String(formData.get("reason") ?? ""), actor); }
  catch (error) { finish(2, error); }
  finish(2);
}

export async function setupAccountAction(formData: FormData) {
  const actor = await admin();
  const input = { email: formData.get("email"), displayName: formData.get("displayName"), role: formData.get("role"), password: formData.get("password"), departmentId: formData.get("departmentId"), kitchenRoute: formData.get("kitchenRoute") };
  try { const id = String(formData.get("userId") ?? ""); if (id) await updateAccount(id, input, actor); else await createAccount(input, actor); }
  catch (error) { finish(3, error); }
  finish(3);
}

export async function setupAccountStatusAction(formData: FormData) {
  const actor = await admin();
  try { await setAccountStatus(String(formData.get("userId")), String(formData.get("status")) as ActiveStatus, String(formData.get("reason") ?? ""), actor); }
  catch (error) { finish(3, error); }
  finish(3);
}

export async function setupRouteAction(formData: FormData) {
  const actor = await admin();
  try {
    const settings = await readOperationalSettings();
    const meals = await prisma.mealType.findMany({ where: { status: "ACTIVE" }, select: { id: true, cutoffTime: true, serviceTime: true } });
    await updateOperationalSettings({ ...settings, sondeEnabled: formData.get("sondeEnabled") === "on" }, meals, actor, "Xác nhận đường nuôi trong thiết lập ban đầu");
  } catch (error) { finish(4, error); }
  finish(5);
}

export async function setupDietTypeAction(formData: FormData) {
  const actor = await admin();
  try { await saveDietType(String(formData.get("dietTypeId") ?? "") || null, { code: formData.get("code"), name: formData.get("name"), feedingRoute: formData.get("feedingRoute") as FeedingRoute, dietCodeRefId: formData.get("dietCodeRefId"), sortOrder: formData.get("sortOrder") }, actor); }
  catch (error) { finish(5, error); }
  finish(5);
}

export async function setupDietTypeStatusAction(formData: FormData) {
  const actor = await admin();
  try { await setDietTypeStatus(String(formData.get("dietTypeId")), formData.get("active") === "true", String(formData.get("reason") ?? ""), actor); }
  catch (error) { finish(5, error); }
  finish(5);
}

export async function setupMealTypeAction(formData: FormData) {
  const actor = await admin();
  try { await saveMealType(String(formData.get("mealTypeId") ?? "") || null, { code: formData.get("code"), name: formData.get("name"), cutoffTime: formData.get("cutoffTime"), serviceTime: formData.get("serviceTime"), feedingRoute: formData.get("feedingRoute"), sortOrder: formData.get("sortOrder") }, actor); }
  catch (error) { finish(6, error); }
  finish(6);
}

export async function setupMealTypeStatusAction(formData: FormData) {
  const actor = await admin();
  try { await setMealTypeStatus(String(formData.get("mealTypeId")), formData.get("active") === "true", String(formData.get("reason") ?? ""), actor); }
  catch (error) { finish(6, error); }
  finish(6);
}

export async function completeSetupAction() {
  const actor = await admin();
  try { await completeFirstTimeSetup(actor); }
  catch (error) { finish(7, error); }
  for (const path of ["/", "/quan-ly", "/quan-tri", "/lich", "/bao-suat", "/bep", "/thuc-don"]) revalidatePath(path);
  redirect("/quan-ly?setup=completed");
}
