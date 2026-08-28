"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";

export function ActionButton({
  children,
  pendingLabel = "Đang xử lý…",
  completedLabel,
  pending: pendingOverride = false,
  completed = false,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
  completedLabel?: string;
  pending?: boolean;
  completed?: boolean;
}) {
  const form = useFormStatus();
  const pending = form.pending || pendingOverride;
  return (
    <button
      {...props}
      disabled={disabled || pending || completed}
      aria-disabled={disabled || pending || completed}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="action-spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : completed ? (
        <>
          <Check aria-hidden="true" />
          {completedLabel ?? "Đã hoàn tất"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ActionFeedback({
  result,
  actionId,
}: {
  result: ActionResult;
  actionId?: string;
}) {
  useEffect(() => {
    if (result.status === "success" && actionId)
      window.dispatchEvent(
        new CustomEvent("demo:action-success", { detail: { actionId } }),
      );
  }, [actionId, result.status]);
  if (result.status === "idle" || !result.message) return null;
  return (
    <p
      className={`action-feedback is-${result.status}`}
      role={result.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {result.status === "success" ? <Check aria-hidden="true" /> : null}
      <span>{result.message}</span>
    </p>
  );
}
