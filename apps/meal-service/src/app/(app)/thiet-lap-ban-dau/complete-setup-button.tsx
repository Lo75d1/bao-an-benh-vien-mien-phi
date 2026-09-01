"use client";

import { useState } from "react";
import type { Language } from "@/lib/i18n";

export function CompleteSetupButton({ disabled, language }: { disabled: boolean; language: Language }) {
  const en = language === "en";
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  async function complete() {
    if (!confirm(en ? "The system will set new temporary passwords for staff accounts and download the XLSX once. Store the file securely." : "Hệ thống sẽ đặt mật khẩu tạm mới cho các tài khoản nhân viên và tải XLSX một lần. Hãy lưu file ở nơi an toàn.")) return;
    setState("loading"); setError("");
    try {
      const response = await fetch("/api/setup/complete", { method: "POST" });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error ?? (en ? "Unable to complete setup." : "Không thể hoàn tất khởi tạo.")); }
      const blob = await response.blob(); const disposition = response.headers.get("content-disposition") ?? ""; const name = disposition.match(/filename="([^"]+)"/)?.[1] ?? "tai-khoan-ban-giao.xlsx";
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
      window.location.assign(`/thiet-lap-ban-dau/hoan-tat?lang=${language}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : (en ? "Unable to complete setup." : "Không thể hoàn tất khởi tạo.")); setState("error"); }
  }
  return <div><button type="button" className="primary-action" disabled={disabled || state === "loading"} onClick={complete}>{state === "loading" ? (en ? "Creating schedule and records…" : "Đang tạo lịch và hồ sơ…") : (en ? "Complete & download accounts once →" : "Hoàn tất & tải tài khoản một lần →")}</button>{error ? <p className="setup-error" role="alert">{error}</p> : null}</div>;
}
