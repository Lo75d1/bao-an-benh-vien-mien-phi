"use server";

import { changeOwnPassword } from "@/lib/profile";
import { PasswordChangeError } from "@/lib/profile-rules";
import { getSessionUser } from "@/lib/auth";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";

export type ChangePasswordState = { status: "idle" | "success" | "error"; message: string };

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const locale = await readLocale();
  const t = getTranslations(locale).management.profilePage;
  try {
    const user = await getSessionUser();
    if (user?.demoSessionId) return { status: "error", message: t.demoAccountUnchanged };
    await changeOwnPassword({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    return { status: "success", message: t.passwordChanged };
  } catch (error) {
    if (error instanceof PasswordChangeError) return { status: "error", message: error.message };
    return { status: "error", message: t.passwordChangeFailed };
  }
}
