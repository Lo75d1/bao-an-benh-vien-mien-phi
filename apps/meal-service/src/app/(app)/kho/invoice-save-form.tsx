"use client";

import { ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { validateInvoiceUploadFile } from "@/lib/invoice-upload";

export function InvoiceSaveForm({
  action,
  warehouseId,
  defaultOccurredAt,
}: {
  action: (previous: ActionResult, formData: FormData) => Promise<ActionResult>;
  warehouseId: string;
  defaultOccurredAt: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [result, formAction, pending] = useActionState(action, INITIAL_ACTION_RESULT);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (result.status !== "success") return;
    formRef.current?.reset();
    router.replace("/kho?updated=invoice");
    router.refresh();
  }, [result.status, router]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="invoice-save-form"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const input = form.elements.namedItem("file") as HTMLInputElement | null;
        const error = validateInvoiceUploadFile(input?.files?.[0]);
        setFileError(error);
        if (error) event.preventDefault();
      }}
    >
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <label>
        Ngày hóa đơn
        <input name="occurredAt" type="datetime-local" defaultValue={defaultOccurredAt} required />
      </label>
      <label>
        Ảnh hoặc PDF hóa đơn
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          onChange={(event) => setFileError(validateInvoiceUploadFile(event.currentTarget.files?.[0]))}
        />
      </label>
      <small className="invoice-file-hint">Nhận JPG, PNG, WEBP hoặc PDF. Dung lượng tối đa 10 MB.</small>
      {fileError ? <p className="invoice-file-error" role="alert">{fileError}</p> : null}
      <label>
        Ghi chú
        <input name="note" maxLength={500} placeholder="Ví dụ: chợ sáng, nhà cung cấp…" />
      </label>
      <ActionFeedback result={result} />
      <ActionButton className="primary-action" disabled={Boolean(fileError)} pending={pending} pendingLabel="Đang lưu hóa đơn…">
        <ReceiptText /> Lưu hóa đơn
      </ActionButton>
    </form>
  );
}
