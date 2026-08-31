"use server";

import { revalidatePath } from "next/cache";
import { changeOwnLanguage, changeOwnPassword } from "@/lib/profile";
import { PasswordChangeError } from "@/lib/profile-rules";

export type ChangePasswordState = { status: "idle" | "success" | "error"; message: string };

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  try {
    await changeOwnPassword({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    return { status: "success", message: "Đã đổi mật khẩu. Các phiên đăng nhập khác đã được đăng xuất." };
  } catch (error) {
    if (error instanceof PasswordChangeError) return { status: "error", message: error.message };
    return { status: "error", message: "Không thể đổi mật khẩu lúc này. Vui lòng thử lại." };
  }
}

export async function changeLanguageAction(formData: FormData) {
  await changeOwnLanguage(formData.get("language"));
  revalidatePath("/ho-so");
}
