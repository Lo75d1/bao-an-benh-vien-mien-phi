"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { saveDietMeal } from "@/lib/menu";
import { createMenuTemplate, deleteMenuTemplate } from "@/lib/menu-template";
import type { MenuItemInput } from "@/lib/menu-logic";
import { readRequestClock } from "@/lib/request-clock";
import { normalizeLanguage, type Language } from "@/lib/i18n";

const TEXT = {
  vi: {
    forbidden: "Bạn không có quyền chỉnh thực đơn.",
    invalidItems: "Dữ liệu thực đơn không hợp lệ.",
    noMenus: "Chưa có mã nào để lưu.",
    invalidBulk: "Dữ liệu lưu hàng loạt không hợp lệ.",
  },
  en: {
    forbidden: "You do not have permission to edit menus.",
    invalidItems: "Invalid menu data.",
    noMenus: "There are no codes to save yet.",
    invalidBulk: "Invalid bulk save data.",
  },
} as const;

async function requireDietitian() { const user = await getSessionUser(); if (!user || (user.role !== "DIETITIAN" && user.role !== "ADMIN")) throw new Error(TEXT[normalizeLanguage(user?.language)].forbidden); return user; }
function readItems(formData: FormData, language: Language): MenuItemInput[] { const raw = formData.get("items"); const t = TEXT[language] ?? TEXT.vi; if (typeof raw !== "string") throw new Error(t.invalidItems); try { const value = JSON.parse(raw) as unknown; if (!Array.isArray(value)) throw new Error(t.invalidItems); return value as MenuItemInput[]; } catch { throw new Error(t.invalidItems); } }

export async function saveMenuAction(formData: FormData) { const user = await requireDietitian(); const clock = await readRequestClock(); const dietMealId = String(formData.get("dietMealId") ?? ""); await saveDietMeal({ dietMealId, items: readItems(formData, user.language as Language), sourceTemplateId: String(formData.get("sourceTemplateId") ?? "") || null, patientVisibleNote: formData.get("patientVisibleNote") }, user, clock.now); revalidatePath("/thuc-don"); revalidatePath("/lich"); revalidatePath("/"); redirect(`/thuc-don?meal=${encodeURIComponent(dietMealId)}&saved=menu`); }
export async function saveMenusAction(formData: FormData) {
  const user = await requireDietitian();
  const clock = await readRequestClock();
  const t = TEXT[user.language as Language] ?? TEXT.vi;
  const raw = formData.get("menus");
  if (typeof raw !== "string") throw new Error(t.invalidBulk);
  let menus: Array<{ dietMealId: string; items: MenuItemInput[]; patientVisibleNote?: string }>;
  try { menus = JSON.parse(raw) as typeof menus; } catch { throw new Error(t.invalidBulk); }
  if (!Array.isArray(menus) || menus.length === 0) throw new Error(t.noMenus);
  for (const menu of menus) await saveDietMeal({ dietMealId: menu.dietMealId, items: menu.items, sourceTemplateId: null, patientVisibleNote: menu.patientVisibleNote }, user, clock.now);
  revalidatePath("/thuc-don"); revalidatePath("/lich"); revalidatePath("/");
  redirect(`/thuc-don?mode=multiple&meal=${encodeURIComponent(menus[0].dietMealId)}&saved=menus`);
}
export async function saveTemplateAction(formData: FormData) { const user = await requireDietitian(); const dietMealId = String(formData.get("dietMealId") ?? ""); await createMenuTemplate({ name: String(formData.get("templateName") ?? ""), dietTypeId: String(formData.get("dietTypeId") ?? "") || null, feedingRoute: formData.get("feedingRoute") === "SONDE" ? "SONDE" : "NORMAL", items: readItems(formData, user.language as Language) }, user); revalidatePath("/thuc-don"); redirect(`/thuc-don?meal=${encodeURIComponent(dietMealId)}&saved=template`); }
export async function deleteTemplateAction(formData: FormData) { const user = await requireDietitian(); await deleteMenuTemplate(String(formData.get("templateId") ?? ""), user); revalidatePath("/thuc-don"); redirect("/thuc-don?saved=deleted"); }
