"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpFromHeaders, submitPatientNote } from "@/lib/patient-note";

function safeReturnValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{0,80}$/.test(value) ? value : "";
}

export async function submitPublicPatientNoteAction(formData: FormData) {
  const token = safeReturnValue(formData.get("departmentToken"));
  const diet = safeReturnValue(formData.get("returnDiet"));
  const date = typeof formData.get("returnDate") === "string" && /^\d{4}-\d{2}-\d{2}$/.test(String(formData.get("returnDate"))) ? String(formData.get("returnDate")) : "";
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders.get("x-forwarded-for"), requestHeaders.get("x-real-ip"));
  const params = new URLSearchParams({ patient: "1" });
  if (diet) params.set("diet", diet);
  if (date) params.set("date", date);

  try {
    await submitPatientNote({ token, note: formData.get("note"), contactName: formData.get("contactName"), ip });
    params.set("note", "sent");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi ghi chú.";
    params.set("note", message.includes("quá nhiều") ? "limited" : message.includes("3 đến 500") ? "invalid" : "unavailable");
  }
  redirect(`/?${params.toString()}#gui-ghi-chu`);
}
