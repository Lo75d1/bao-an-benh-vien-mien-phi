"use server";

import { revalidatePath } from "next/cache";
import { changeOwnLanguage, changeOwnPassword } from "@/lib/profile";
import { PasswordChangeError } from "@/lib/profile-rules";
import { normalizeLanguage } from "@/lib/i18n";
import { PROFILE_TEXT } from "./catalog";

export type ChangePasswordState = { status: "idle" | "success" | "error"; message: string };

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const t = PROFILE_TEXT[normalizeLanguage(formData.get("language"))];
  try {
    await changeOwnPassword({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    return { status: "success", message: t.success };
  } catch (error) {
    if (error instanceof PasswordChangeError) return { status: "error", message: error.message };
    return { status: "error", message: t.failure };
  }
}

export async function changeLanguageAction(formData: FormData) {
  await changeOwnLanguage(formData.get("language"));
  revalidatePath("/ho-so");
}
