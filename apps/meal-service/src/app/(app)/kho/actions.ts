"use server";

import type { DocumentKind, InventoryType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { validateEvidenceFile } from "@/lib/evidence-storage";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { attachInventoryDocument, createInventoryTransaction, saveWarehouseInvoice, updateInventoryTransaction, voidInventoryTransaction, type TransactionLineInput } from "@/lib/warehouse";

async function getWarehouseActionTexts() {
  return getTranslations(await readLocale()).management.warehouseAction;
}

async function requireActor(t: Awaited<ReturnType<typeof getWarehouseActionTexts>>) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "DIETITIAN", "KITCHEN"].includes(user.role)) throw new Error(t.notAuthorized);
  if (user.demoSessionId) throw new Error(t.demoReadOnly);
  return user;
}

function occurredAt(value: FormDataEntryValue | null, t: Awaited<ReturnType<typeof getWarehouseActionTexts>>) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) throw new Error(t.invalidOccurredAt);
  return date;
}

function lines(formData: FormData): TransactionLineInput[] {
  const ids = formData.getAll("lineId").map(String);
  const foodIds = formData.getAll("foodId").map(String);
  const names = formData.getAll("itemName").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const units = formData.getAll("unit").map(String);
  const prices = formData.getAll("unitPrice").map(String);
  return names.flatMap((name, index) => {
    if (!name.trim() && !quantities[index]?.trim() && !units[index]?.trim()) return [];
    return [{ id: ids[index] || undefined, foodId: foodIds[index] || null, itemName: name, quantity: Number(quantities[index]), unit: units[index], unitPrice: prices[index]?.trim() ? Number(prices[index]) : null }];
  });
}

export async function createTransactionAction(formData: FormData) {
  const t = await getWarehouseActionTexts();
  const actor = await requireActor(t);
  await createInventoryTransaction({ warehouseId: String(formData.get("warehouseId") ?? ""), type: String(formData.get("type") ?? "") as InventoryType, occurredAt: occurredAt(formData.get("occurredAt"), t), relatedDietMealId: String(formData.get("relatedDietMealId") ?? "") || null, note: String(formData.get("note") ?? "") || null, lines: lines(formData) }, actor, t.lib);
  revalidatePath("/kho");
  redirect("/kho?updated=created");
}

export async function updateTransactionAction(formData: FormData) {
  const t = await getWarehouseActionTexts();
  const actor = await requireActor(t);
  await updateInventoryTransaction({ id: String(formData.get("transactionId") ?? ""), occurredAt: occurredAt(formData.get("occurredAt"), t), note: String(formData.get("note") ?? "") || null, lines: lines(formData) }, actor, t.lib);
  revalidatePath("/kho");
  redirect("/kho?updated=edited");
}

export async function cancelTransactionAction(formData: FormData) {
  const t = await getWarehouseActionTexts();
  const actor = await requireActor(t);
  await voidInventoryTransaction(String(formData.get("transactionId") ?? ""), String(formData.get("reason") ?? ""), actor, t.lib);
  revalidatePath("/kho");
  redirect("/kho?updated=cancelled");
}

const DOCUMENT_KINDS = new Set<DocumentKind>(["BILL", "INVOICE", "PHOTO", "OTHER"]);
export async function saveInvoiceAction(formData: FormData) {
  const t = await getWarehouseActionTexts();
  const actor = await requireActor(t);
  const file = formData.get("file");
  if (!(file instanceof File) || !await validateEvidenceFile(file)) redirect("/kho?storage=invalid");
  const result = await saveWarehouseInvoice({ warehouseId: String(formData.get("warehouseId") ?? ""), occurredAt: occurredAt(formData.get("occurredAt"), t), file, note: String(formData.get("note") ?? "") || null }, actor, t.lib);
  revalidatePath("/kho");
  redirect(result.stored ? "/kho?updated=invoice" : "/kho?storage=unavailable");
}

export async function uploadDocumentAction(formData: FormData) {
  const t = await getWarehouseActionTexts();
  const actor = await requireActor(t);
  const kind = String(formData.get("kind") ?? "") as DocumentKind;
  const file = formData.get("file");
  if (!DOCUMENT_KINDS.has(kind) || !(file instanceof File) || !await validateEvidenceFile(file)) throw new Error(t.invalidDocumentFile);
  const result = await attachInventoryDocument({ transactionId: String(formData.get("transactionId") ?? ""), kind, file, note: String(formData.get("documentNote") ?? "") || null }, actor, t.lib);
  revalidatePath("/kho");
  redirect(result.stored ? "/kho?updated=document" : "/kho?storage=unavailable");
}
