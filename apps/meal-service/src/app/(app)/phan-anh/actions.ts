"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { updatePatientSubmission } from "@/lib/patient-note";
import { normalizeLanguage } from "@/lib/i18n";
import { SUBMISSION_TEXT } from "./catalog";

export async function updatePatientSubmissionAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const t = SUBMISSION_TEXT[normalizeLanguage(user.language)];
  const status = String(formData.get("status") ?? "");
  if (status !== "APPROVED" && status !== "REJECTED")
    throw new Error(t.invalidStatus);
  await updatePatientSubmission(
    {
      id: String(formData.get("id") ?? ""),
      status,
      reviewNote: formData.get("reviewNote"),
    },
    user,
  );
  revalidatePath("/phan-anh");
  revalidatePath("/bep");
}
