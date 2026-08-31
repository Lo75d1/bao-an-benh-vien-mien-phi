"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders, submitPatientSubmission } from "@/lib/patient-note";

function returnQuery(formData: FormData, code: string) {
  const params = new URLSearchParams({ note: code });
  const date = formData.get("returnDate");
  const lang = formData.get("returnLang");
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) params.set("date", date);
  if (lang === "en") params.set("lang", "en");
  return params.toString();
}

export async function submitPatientNoteAction(token: string, formData: FormData) {
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders.get("x-forwarded-for"), requestHeaders.get("x-real-ip"));
  try {
    await submitPatientSubmission({ token, type: formData.get("type"), note: formData.get("note"), contactName: formData.get("contactName"), contactInfo: formData.get("contactInfo"), mealDate: formData.get("mealDate"), mealEventId: formData.get("mealEventId"), ip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi ghi chú.";
    const code = message.includes("quá nhiều") ? "limited" : message.includes("3 đến 500") ? "invalid" : "unavailable";
    redirect(`/k/${encodeURIComponent(token)}?${returnQuery(formData, code)}#gui-ghi-chu`);
  }
  redirect(`/k/${encodeURIComponent(token)}?${returnQuery(formData, "sent")}#gui-ghi-chu`);
}
