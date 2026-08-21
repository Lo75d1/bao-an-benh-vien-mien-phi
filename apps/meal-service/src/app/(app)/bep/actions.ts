"use server";
import type { DietMealStatus, EvidenceKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { storeMealEvidence, transitionDietMeal } from "@/lib/kitchen";
import { acknowledgeLateMealAddition } from "@/lib/late-addition";

async function requireKitchen() { const user = await getSessionUser(); if (!user || user.role !== "KITCHEN") throw new Error("Bạn không có quyền thao tác bếp."); return user; }
export async function transitionMealAction(formData: FormData) { const user = await requireKitchen(); await transitionDietMeal(String(formData.get("dietMealId") ?? ""), String(formData.get("target") ?? "") as DietMealStatus, user); revalidatePath("/bep"); revalidatePath("/lich"); redirect("/bep?updated=status"); }
const EVIDENCE_KINDS = new Set<EvidenceKind>(["MEAL_PHOTO", "FOOD_SAMPLE", "STOCK_IN", "INVOICE"]);
export async function uploadEvidenceAction(formData: FormData) { const user = await requireKitchen(); const kind = String(formData.get("kind") ?? "") as EvidenceKind; const file = formData.get("file"); if (!EVIDENCE_KINDS.has(kind) || !(file instanceof File) || file.size === 0) throw new Error("Cần chọn loại và tệp ảnh hợp lệ."); if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Chỉ nhận ảnh tối đa 10 MB."); const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null; const result = await storeMealEvidence({ dietMealId: String(formData.get("dietMealId") ?? ""), kind, file, note }, user); revalidatePath("/bep"); redirect(result.stored ? "/bep?updated=evidence" : "/bep?storage=unavailable"); }
export async function acknowledgeAdditionAction(formData: FormData) { const user = await requireKitchen(); await acknowledgeLateMealAddition({ additionId: String(formData.get("additionId") ?? ""), ackStatus: String(formData.get("ackStatus") ?? "") as import("@prisma/client").AckStatus, kitchenNote: String(formData.get("kitchenNote") ?? "").trim() || null }, user); revalidatePath("/bep"); revalidatePath("/bao-suat"); redirect("/bep?updated=addition"); }
