"use client";

import { RotateCcw, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DemoWorkspace } from "@/lib/demo-session";
import { workspaceHrefWithDemoTime } from "@/lib/demo-workspace-url";

const ITEMS: Array<{ value: DemoWorkspace; label: string }> = [
  { value: "NURSE", label: "Điều dưỡng" },
  { value: "DIETITIAN", label: "Dinh dưỡng" },
  { value: "KITCHEN_NORMAL", label: "Bếp thường" },
  { value: "ADMIN", label: "Quản trị" },
  { value: "KITCHEN_SONDE", label: "Sonde" },
];

export function DemoWorkspaceSwitcher({ active }: { active: DemoWorkspace }) {
  const [pending, setPending] = useState<string | null>(null);
  const searchParams = useSearchParams();

  async function action(kind: "switch" | "reset", workspace = active) {
    setPending(kind === "switch" ? workspace : kind);
    const response = await fetch("/api/demo/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: kind, workspace }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      const href = kind === "reset"
        ? window.location.pathname
        : workspaceHrefWithDemoTime(body.href, searchParams.get("demoNow"));
      window.location.assign(href);
    } else {
      setPending(null);
      window.alert(body.error ?? "Không thể cập nhật phiên Demo.");
    }
  }

  async function exit() {
    setPending("exit");
    await fetch("/api/demo/session", { method: "DELETE" });
    window.location.assign("/demo");
  }

  return <div className="demo-workspace-switcher" aria-label="Chuyển khu vực Demo">
    {ITEMS.map((item) => <button key={item.value} type="button" aria-current={item.value === active ? "page" : undefined} disabled={pending !== null} onClick={() => action("switch", item.value)}>{pending === item.value ? "…" : item.label}</button>)}
    <button type="button" title="Đặt lại dữ liệu phiên Demo" disabled={pending !== null} onClick={() => action("reset")}><RotateCcw/><span>Reset</span></button>
    <button type="button" title="Thoát Demo" disabled={pending !== null} onClick={exit}><X/><span>Thoát</span></button>
  </div>;
}
