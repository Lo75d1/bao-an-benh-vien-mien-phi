"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { KeyRound } from "lucide-react";
import { changePasswordAction, type ChangePasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workspaceForRole, type WorkspaceRole } from "@/lib/role-workspace";

const initialState: ChangePasswordState = { status: "idle", message: "" };
const schema = z.object({ currentPassword: z.string().min(10, "Mật khẩu hiện tại cần ít nhất 10 ký tự.").max(256), newPassword: z.string().min(10, "Mật khẩu mới cần ít nhất 10 ký tự.").max(256), confirmPassword: z.string().min(10, "Hãy nhập lại mật khẩu mới.").max(256) }).superRefine((value, context) => {
  if (value.newPassword === value.currentPassword) context.addIssue({ code: "custom", path: ["newPassword"], message: "Mật khẩu mới phải khác mật khẩu hiện tại." });
  if (value.confirmPassword !== value.newPassword) context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Mật khẩu xác nhận chưa khớp." });
});
type Fields = z.infer<typeof schema>;

export function PasswordForm({ role }: { role: WorkspaceRole }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Fields>({ resolver: zodResolver(schema), shouldFocusError: true });

  useEffect(() => {
    if (state.status === "success") { formRef.current?.reset(); reset(); window.location.assign(workspaceForRole(role)); }
  }, [reset, role, state.status]);

  const submit = handleSubmit((_values, event) => { const form = event?.currentTarget; if (form instanceof HTMLFormElement) { const data = new FormData(form); startTransition(() => formAction(data)); } });

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
        <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} aria-invalid={!!errors.currentPassword} aria-describedby={errors.currentPassword ? "currentPassword-error" : undefined} />
        {errors.currentPassword && <p id="currentPassword-error" role="alert" className="text-sm text-red-800">{errors.currentPassword.message}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPassword">Mật khẩu mới</Label>
        <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} aria-invalid={!!errors.newPassword} aria-describedby={errors.newPassword ? "password-hint newPassword-error" : "password-hint"} />
        <p id="password-hint" className="text-sm leading-6 text-muted-foreground">Dùng từ 10 đến 256 ký tự và không trùng mật khẩu hiện tại.</p>
        {errors.newPassword && <p id="newPassword-error" role="alert" className="text-sm text-red-800">{errors.newPassword.message}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined} />
        {errors.confirmPassword && <p id="confirmPassword-error" role="alert" className="text-sm text-red-800">{errors.confirmPassword.message}</p>}
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
