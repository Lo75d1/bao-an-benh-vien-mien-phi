"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders, submitPatientNote } from "@/lib/patient-note";
import { isAllowedSubmissionAttachmentMime, MAX_SUBMISSION_ATTACHMENT_SIZE } from "@/lib/submission-attachment-storage";

export async function submitPatientNoteAction(token: string, formData: FormData) {
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders.get("x-forwarded-for"), requestHeaders.get("x-real-ip"));
  try {
    const attachment = formData.get("attachment");
    if (attachment instanceof File && attachment.size > 0) {
      if ((attachment.type && !isAllowedSubmissionAttachmentMime(attachment.type)) || attachment.size > MAX_SUBMISSION_ATTACHMENT_SIZE) throw new Error("PATIENT_ATTACHMENT_INVALID");
    }
    await submitPatientNote({ token, note: formData.get("note"), contactName: formData.get("contactName"), attachment: attachment instanceof File ? attachment : null, ip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi ghi chú.";
    const code = message.includes("PATIENT_ATTACHMENT") ? "invalidAttachment" : message.includes("quá nhiều") ? "limited" : message.includes("3 đến 500") ? "invalid" : "unavailable";
    redirect(`/k/${encodeURIComponent(token)}?note=${code}#gui-ghi-chu`);
  }
  redirect(`/k/${encodeURIComponent(token)}?note=sent#gui-ghi-chu`);
}
