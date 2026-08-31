"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders, normalizeSubmissionType, submitPatientSubmission } from "@/lib/patient-note";
import { normalizeLanguage } from "@/lib/i18n";

function safeReturnValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{0,80}$/.test(value) ? value : "";
}

export async function submitPublicPatientNoteAction(formData: FormData) {
  const token = safeReturnValue(formData.get("departmentToken"));
  const diet = safeReturnValue(formData.get("returnDiet"));
  const lang = normalizeLanguage(formData.get("returnLang"));
  const date = typeof formData.get("returnDate") === "string" && /^\d{4}-\d{2}-\d{2}$/.test(String(formData.get("returnDate"))) ? String(formData.get("returnDate")) : "";
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders.get("x-forwarded-for"), requestHeaders.get("x-real-ip"));
  const params = new URLSearchParams({ patient: "1", lang });
  if (diet) params.set("diet", diet);
  if (date) params.set("date", date);

  try {
    const type = normalizeSubmissionType(formData.get("type"));
    const attachment = formData.get("attachment");
    if (attachment instanceof File && attachment.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(attachment.type)) throw new Error("Tệp đính kèm không hợp lệ.");
      if (attachment.size > 10 * 1024 * 1024) throw new Error("Tệp đính kèm tối đa 10 MB.");
    }
    await submitPatientSubmission({ token, type, note: formData.get("note"), contactName: formData.get("contactName"), contactInfo: formData.get("contactInfo"), attachment: attachment instanceof File ? attachment : null, ip });
    params.set("note", type === "KITCHEN_NOTE" ? "sent-kitchen" : "sent-feedback");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi nội dung.";
    params.set("note", message.includes("quá nhiều") ? "limited" : message.includes("3 đến 500") ? "invalid" : "unavailable");
  }
  redirect(`/?${params.toString()}#gui-ghi-chu`);
}
