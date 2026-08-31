"use server";

import type { DocumentKind, InventoryType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";
import { getSessionUser } from "@/lib/auth";
import { validateInvoiceUploadFile } from "@/lib/invoice-upload";
import { attachInventoryDocument, createInventoryTransaction, saveWarehouseInvoice, updateInventoryTransaction, voidInventoryTransaction, type TransactionLineInput } from "@/lib/warehouse";

async function requireActor() {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "DIETITIAN", "KITCHEN"].includes(user.role)) throw new Error("Bạn không có quyền thao tác kho.");
  if (user.demoSessionId) throw new Error("Kho chỉ xem trong Demo; thay đổi không được ghi vào dữ liệu nền.");
  return user;
}

function occurredAt(value: FormDataEntryValue | null) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) throw new Error("Thời điểm giao dịch không hợp lệ.");
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
  const actor = await requireActor();
  await createInventoryTransaction({ warehouseId: String(formData.get("warehouseId") ?? ""), type: String(formData.get("type") ?? "") as InventoryType, occurredAt: occurredAt(formData.get("occurredAt")), relatedDietMealId: String(formData.get("relatedDietMealId") ?? "") || null, note: String(formData.get("note") ?? "") || null, lines: lines(formData) }, actor);
  revalidatePath("/kho");
  redirect("/kho?updated=created");
}

export async function updateTransactionAction(formData: FormData) {
  const actor = await requireActor();
  await updateInventoryTransaction({ id: String(formData.get("transactionId") ?? ""), occurredAt: occurredAt(formData.get("occurredAt")), note: String(formData.get("note") ?? "") || null, lines: lines(formData) }, actor);
  revalidatePath("/kho");
  redirect("/kho?updated=edited");
}

export async function cancelTransactionAction(formData: FormData) {
  const actor = await requireActor();
  await voidInventoryTransaction(String(formData.get("transactionId") ?? ""), String(formData.get("reason") ?? ""), actor);
  revalidatePath("/kho");
  redirect("/kho?updated=cancelled");
}

const DOCUMENT_KINDS = new Set<DocumentKind>(["BILL", "INVOICE", "PHOTO", "OTHER"]);
export async function saveInvoiceAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Tep khong hop le.");
    const fileError = validateInvoiceUploadFile(file);
    if (fileError) throw new Error(fileError);
    const result = await saveWarehouseInvoice({ warehouseId: String(formData.get("warehouseId") ?? ""), occurredAt: occurredAt(formData.get("occurredAt")), file, note: String(formData.get("note") ?? "") || null }, actor);
    if (!result.stored) throw new Error("Chua the luu tep hoa don. Vui long kiem tra dung luong, dinh dang hoac thu muc upload.");
    revalidatePath("/kho");
    return actionSuccess("Da luu hoa don va ghi nhat ky.");
  } catch (error) {
    return actionFailure(error);
  }
}
export async function uploadDocumentAction(formData: FormData) {
  const actor = await requireActor();
  const kind = String(formData.get("kind") ?? "") as DocumentKind;
  const file = formData.get("file");
  if (!DOCUMENT_KINDS.has(kind) || !(file instanceof File) || file.size === 0) throw new Error("Cần chọn loại và tệp chứng từ hợp lệ.");
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Chỉ nhận ảnh tối đa 10 MB.");
  const result = await attachInventoryDocument({ transactionId: String(formData.get("transactionId") ?? ""), kind, file, note: String(formData.get("documentNote") ?? "") || null }, actor);
  revalidatePath("/kho");
  redirect(result.stored ? "/kho?updated=document" : "/kho?storage=unavailable");
}
