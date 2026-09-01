"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { saveDietMeal } from "@/lib/menu";
import { createMenuTemplate, deleteMenuTemplate } from "@/lib/menu-template";
import type { MenuItemInput } from "@/lib/menu-logic";
import { readActionClock as readRequestClock } from "@/lib/request-clock";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";

async function getActionTexts() {
  return getTranslations(await readLocale()).management.thucDonAction;
}

async function requireDietitian() {
  const user = await getSessionUser();
  if (!user || (user.role !== "DIETITIAN" && user.role !== "ADMIN")) {
    throw new Error((await getActionTexts()).notAuthorized);
  }
  return user;
}

async function readItems(formData: FormData): Promise<MenuItemInput[]> {
  const texts = await getActionTexts();
  const raw = formData.get("items");
  if (typeof raw !== "string") throw new Error(texts.invalidMenuData);
  const value = JSON.parse(raw) as unknown;
  if (!Array.isArray(value)) throw new Error(texts.invalidMenuData);
  return value as MenuItemInput[];
}

export async function saveMenuAction(formData: FormData) {
  const user = await requireDietitian();
  const clock = await readRequestClock();
  const dietMealId = String(formData.get("dietMealId") ?? "");
  await saveDietMeal(
    {
      dietMealId,
      items: await readItems(formData),
      sourceTemplateId: String(formData.get("sourceTemplateId") ?? "") || null,
      patientVisibleNote: formData.get("patientVisibleNote"),
    },
    user,
    clock.now,
  );
  revalidatePath("/thuc-don");
  revalidatePath("/lich");
  revalidatePath("/");
  redirect(`/thuc-don?meal=${encodeURIComponent(dietMealId)}&saved=menu`);
}

export async function saveMenusAction(formData: FormData) {
  const user = await requireDietitian();
  const clock = await readRequestClock();
  const raw = formData.get("menus");
  const texts = await getActionTexts();
  if (typeof raw !== "string") throw new Error(texts.invalidBulkMenuData);
  const menus = JSON.parse(raw) as Array<{ dietMealId: string; items: MenuItemInput[]; patientVisibleNote?: string }>;
  if (!Array.isArray(menus) || menus.length === 0) throw new Error(texts.noMenusToSave);
  for (const menu of menus) {
    await saveDietMeal(
      { dietMealId: menu.dietMealId, items: menu.items, sourceTemplateId: null, patientVisibleNote: menu.patientVisibleNote },
      user,
      clock.now,
    );
  }
  revalidatePath("/thuc-don");
  revalidatePath("/lich");
  revalidatePath("/");
  redirect(`/thuc-don?mode=multiple&meal=${encodeURIComponent(menus[0].dietMealId)}&saved=menus`);
}

export async function saveTemplateAction(formData: FormData) {
  const user = await requireDietitian();
  const texts = await getActionTexts();
  if (user.demoSessionId) throw new Error(texts.demoTemplateBlocked);
  const dietMealId = String(formData.get("dietMealId") ?? "");
  await createMenuTemplate({
    name: String(formData.get("templateName") ?? ""),
    dietTypeId: String(formData.get("dietTypeId") ?? "") || null,
    feedingRoute: formData.get("feedingRoute") === "SONDE" ? "SONDE" : "NORMAL",
    items: await readItems(formData),
  }, user);
  revalidatePath("/thuc-don");
  redirect(`/thuc-don?meal=${encodeURIComponent(dietMealId)}&saved=template`);
}

export async function deleteTemplateAction(formData: FormData) {
  const user = await requireDietitian();
  const texts = await getActionTexts();
  if (user.demoSessionId) throw new Error(texts.demoTemplateDeleteBlocked);
  await deleteMenuTemplate(String(formData.get("templateId") ?? ""), user);
  revalidatePath("/thuc-don");
  redirect("/thuc-don?saved=deleted");
}
