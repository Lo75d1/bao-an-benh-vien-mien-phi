"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { updatePatientSubmission } from "@/lib/patient-note";

export async function updatePatientSubmissionAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const status = String(formData.get("status") ?? "");
  if (status !== "APPROVED" && status !== "REJECTED") throw new Error("Tr?ng th?i x? l? kh?ng h?p l?.");
  await updatePatientSubmission({ id: String(formData.get("id") ?? ""), status, reviewNote: formData.get("reviewNote") }, user);
  revalidatePath("/phan-anh");
  revalidatePath("/bep");
}
