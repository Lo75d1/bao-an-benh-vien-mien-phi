"use client";

import { useState } from "react";

export function CompleteSetupButton({ disabled }: { disabled: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  async function complete() {
    if (!confirm("Hệ thống sẽ đặt mật khẩu tạm mới cho các tài khoản nhân viên và tải XLSX một lần. Hãy lưu file ở nơi an toàn.")) return;
    setState("loading"); setError("");
    try {
      const response = await fetch("/api/setup/complete", { method: "POST" });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error ?? "Không thể hoàn tất khởi tạo."); }
      const blob = await response.blob(); const disposition = response.headers.get("content-disposition") ?? ""; const name = disposition.match(/filename="([^"]+)"/)?.[1] ?? "tai-khoan-ban-giao.xlsx";
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
      window.location.assign("/thiet-lap-ban-dau/hoan-tat");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể hoàn tất khởi tạo."); setState("error"); }
  }
  return <div><button type="button" className="primary-action" disabled={disabled || state === "loading"} onClick={complete}>{state === "loading" ? "Đang tạo lịch và hồ sơ…" : "Hoàn tất & tải tài khoản một lần →"}</button>{error ? <p className="setup-error" role="alert">{error}</p> : null}</div>;
}
