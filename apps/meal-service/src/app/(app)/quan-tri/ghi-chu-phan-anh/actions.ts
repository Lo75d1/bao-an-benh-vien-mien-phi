"use server";

import type { PatientSubmissionStatus, PatientSubmissionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { transitionPatientSubmission } from "@/lib/patient-note";

const ACTIONS = new Set(["ACCEPT", "IN_PROGRESS", "FORWARD_TO_KITCHEN", "RESOLVE", "REJECT"]);

export async function updatePatientSubmissionAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "NURSE", "DIETITIAN"].includes(user.role)) redirect("/");
  const action = String(formData.get("action") ?? "");
  if (!ACTIONS.has(action)) throw new Error("Hành động không hợp lệ.");
  await transitionPatientSubmission({ id: String(formData.get("id") ?? ""), action: action as "ACCEPT" | "IN_PROGRESS" | "FORWARD_TO_KITCHEN" | "RESOLVE" | "REJECT", note: formData.get("note") }, user);
  const params = new URLSearchParams();
  const type = String(formData.get("filterType") ?? "");
  const status = String(formData.get("filterStatus") ?? "");
  const departmentId = String(formData.get("filterDepartment") ?? "");
  if (type) params.set("type", type as PatientSubmissionType);
  if (status) params.set("status", status as PatientSubmissionStatus);
  if (departmentId) params.set("departmentId", departmentId);
  params.set("updated", "1");
  revalidatePath("/quan-tri/ghi-chu-phan-anh");
  redirect(`/quan-tri/ghi-chu-phan-anh?${params.toString()}`);
}
