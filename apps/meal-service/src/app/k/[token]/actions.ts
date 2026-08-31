"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders, submitPatientSubmission } from "@/lib/patient-note";

export async function submitPatientNoteAction(token: string, formData: FormData) {
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders.get("x-forwarded-for"), requestHeaders.get("x-real-ip"));
  try {
    await submitPatientSubmission({ token, type: formData.get("type"), note: formData.get("note"), contactName: formData.get("contactName"), contactInfo: formData.get("contactInfo"), mealDate: formData.get("mealDate"), mealEventId: formData.get("mealEventId"), ip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi ghi chú.";
    const code = message.includes("quá nhiều") ? "limited" : message.includes("3 đến 500") ? "invalid" : "unavailable";
    redirect(`/k/${encodeURIComponent(token)}?note=${code}#gui-ghi-chu`);
  }
  redirect(`/k/${encodeURIComponent(token)}?note=sent#gui-ghi-chu`);
}
