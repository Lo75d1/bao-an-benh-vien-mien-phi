"use client";

import { useActionState, useRef, useState } from "react";
import { ReceiptText } from "lucide-react";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { MAX_INVOICE_UPLOAD_BYTES, validateInvoiceUploadFile } from "@/lib/invoice-upload";
import type { Language } from "@/lib/i18n";

type Props = {
  warehouseId: string;
  defaultOccurredAt: string;
  action: (previous: ActionResult, formData: FormData) => Promise<ActionResult>;
  language?: Language;
};

export function InvoiceSaveForm({ warehouseId, defaultOccurredAt, action, language = "vi" }: Props) {
  const en = language === "en";
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState("");
  const [result, formAction, pending] = useActionState(async (previous: ActionResult, formData: FormData) => {
    const file = formData.get("file");
    const validation = validateInvoiceUploadFile(file instanceof File ? file : null, language);
    if (validation) return { status: "error", message: validation } as ActionResult;
    setClientError("");
    const next = await action(previous, formData);
    if (next.status === "success") formRef.current?.reset();
    return next;
  }, INITIAL_ACTION_RESULT);

  return <form ref={formRef} action={formAction} className="invoice-save-form">
    <input type="hidden" name="warehouseId" value={warehouseId}/>
    <label>{en ? "Invoice date" : "Ngày hóa đơn"}<input name="occurredAt" type="datetime-local" defaultValue={defaultOccurredAt} required/></label>
    <label>{en ? "Invoice image or PDF" : "Ảnh hoặc PDF hóa đơn"}<input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={(event) => setClientError(validateInvoiceUploadFile(event.currentTarget.files?.[0], language) ?? "")}/></label>
    <small>{en ? "Accepted: JPG, PNG, WEBP, or PDF up to" : "Chỉ nhận JPG, PNG, WEBP hoặc PDF tối đa"} {Math.round(MAX_INVOICE_UPLOAD_BYTES / 1024 / 1024)} MB.</small>
    {clientError ? <p className="action-feedback is-error" role="alert">{clientError}</p> : null}
    <label>{en ? "Note" : "Ghi chú"}<input name="note" maxLength={500} placeholder={en ? "Example: early market, supplier…" : "Ví dụ: chợ sớm, nhà cung cấp…"}/></label>
    <ActionFeedback result={result}/>
    <ActionButton className="primary-action" pending={pending} pendingLabel={en ? "Saving invoice…" : "Đang lưu hóa đơn…"}><ReceiptText/> {en ? "Save invoice" : "Lưu hóa đơn"}</ActionButton>
  </form>;
}
