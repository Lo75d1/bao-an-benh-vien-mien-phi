"use client";

import { ReceiptText } from "lucide-react";
import { useState } from "react";

const MAX_INVOICE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function validateInvoiceFile(file: File | undefined) {
  if (!file) return null;
  if (!ALLOWED_TYPES.has(file.type)) return "Chỉ nhận JPG, PNG, WEBP hoặc PDF.";
  if (file.size > MAX_INVOICE_SIZE) return "Tệp vượt quá giới hạn 10 MB. Vui lòng nén/chọn tệp nhỏ hơn.";
  if (file.size <= 0) return "Tệp không hợp lệ.";
  return null;
}

export function InvoiceSaveForm({ action, warehouseId, defaultOccurredAt }: { action: (formData: FormData) => void; warehouseId: string; defaultOccurredAt: string }) {
  const [fileError, setFileError] = useState<string | null>(null);
  return <form action={action} className="invoice-save-form" onSubmit={(event) => {
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const error = validateInvoiceFile(input?.files?.[0]);
    setFileError(error);
    if (error) event.preventDefault();
  }}>
    <input type="hidden" name="warehouseId" value={warehouseId}/>
    <label>Ngày hóa đơn<input name="occurredAt" type="datetime-local" defaultValue={defaultOccurredAt} required/></label>
    <label>Ảnh hoặc PDF hóa đơn<input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={(event) => setFileError(validateInvoiceFile(event.currentTarget.files?.[0]))}/></label>
    <small className="invoice-file-hint">Nhận JPG, PNG, WEBP hoặc PDF. Dung lượng tối đa 10 MB.</small>
    {fileError ? <p className="invoice-file-error" role="alert">{fileError}</p> : null}
    <label>Ghi chú<input name="note" maxLength={500} placeholder="Ví dụ: chợ sáng, nhà cung cấp…"/></label>
    <button className="primary-action" disabled={Boolean(fileError)}><ReceiptText/> Lưu hóa đơn</button>
  </form>;
}
