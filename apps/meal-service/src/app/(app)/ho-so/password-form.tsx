"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound } from "lucide-react";
import { changePasswordAction, type ChangePasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ChangePasswordState = { status: "idle", message: "" };

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required minLength={10} maxLength={256} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPassword">Mật khẩu mới</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={256} aria-describedby="password-hint" />
        <p id="password-hint" className="text-sm leading-6 text-muted-foreground">Dùng từ 10 đến 256 ký tự và không trùng mật khẩu hiện tại.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={256} />
      </div>
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm leading-6 ${state.status === "success" ? "border-[#0f6e56]/20 bg-[#e1f5ee] text-[#085041]" : "border-red-900/15 bg-red-50 text-red-800"}`}>
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        <KeyRound />{pending ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
