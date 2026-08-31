"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders, normalizeSubmissionType, submitPatientSubmission } from "@/lib/patient-note";

export async function submitPatientNoteAction(token: string, formData: FormData) {
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders.get("x-forwarded-for"), requestHeaders.get("x-real-ip"));
  let code = "sent-feedback";
  try {
    const type = normalizeSubmissionType(formData.get("type"));
    await submitPatientSubmission({ token, type, note: formData.get("note"), contactName: formData.get("contactName"), contactInfo: formData.get("contactInfo"), ip });
    code = type === "KITCHEN_NOTE" ? "sent-kitchen" : "sent-feedback";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi nội dung.";
    code = message.includes("quá nhiều") ? "limited" : message.includes("3 đến 500") ? "invalid" : "unavailable";
  }
  redirect(`/k/${encodeURIComponent(token)}?note=${code}#gui-ghi-chu`);
}
