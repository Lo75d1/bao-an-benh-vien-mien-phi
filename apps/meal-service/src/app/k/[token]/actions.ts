"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders, submitPatientNote } from "@/lib/patient-note";

export async function submitPatientNoteAction(token: string, formData: FormData) {
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders.get("x-forwarded-for"), requestHeaders.get("x-real-ip"));
  try {
    await submitPatientNote({ token, note: formData.get("note"), contactName: formData.get("contactName"), ip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi ghi chú.";
    const code = message.includes("quá nhiều") ? "limited" : message.includes("3 đến 500") ? "invalid" : "unavailable";
    redirect(`/k/${encodeURIComponent(token)}?note=${code}#gui-ghi-chu`);
  }
  redirect(`/k/${encodeURIComponent(token)}?note=sent#gui-ghi-chu`);
}
