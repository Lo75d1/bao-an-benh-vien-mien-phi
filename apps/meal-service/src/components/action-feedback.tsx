"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";
import type { Language } from "@/lib/i18n";

export function ActionButton({ children, pendingLabel, completedLabel, pending: pendingOverride = false, completed = false, disabled, language = "vi", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; pendingLabel?: string; completedLabel?: string; pending?: boolean; completed?: boolean; language?: Language }) {
  const form = useFormStatus();
  const pending = form.pending || pendingOverride;
  return <button {...props} disabled={disabled || pending || completed} aria-disabled={disabled || pending || completed} aria-busy={pending}>{pending ? <><LoaderCircle className="action-spinner" aria-hidden="true"/>{pendingLabel ?? (language === "en" ? "Processing…" : "Đang xử lý…")}</> : completed ? <><Check aria-hidden="true"/>{completedLabel ?? (language === "en" ? "Completed" : "Đã hoàn tất")}</> : children}</button>;
}

export function ActionFeedback({ result }: { result: ActionResult }) {
  if (result.status === "idle" || !result.message) return null;
  return <p className={`action-feedback is-${result.status}`} role={result.status === "error" ? "alert" : "status"} aria-live="polite">{result.status === "success" ? <Check aria-hidden="true"/> : null}<span>{result.message}</span></p>;
}
