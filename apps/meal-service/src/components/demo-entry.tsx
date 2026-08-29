"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { DemoWorkspace } from "@/lib/demo-session";

export type DemoEntryAccount = { key: string; label: string; description: string; email?: string; password?: string; href?: string };
const WORKSPACE: Record<string, DemoWorkspace> = { nurse: "NURSE", dietitian: "DIETITIAN", kitchen: "KITCHEN_NORMAL", admin: "ADMIN", sonde: "KITCHEN_SONDE" };
export const demoDestination = (key: string) => ({ nurse: "/bao-suat", dietitian: "/thuc-don", kitchen: "/bep", sonde: "/bep", admin: "/quan-ly" })[key] ?? "/bao-suat";

async function enterDemo(account?: DemoEntryAccount) {
  if (account?.href) { window.location.assign(account.href); return; }
  const workspace = WORKSPACE[account?.key ?? "nurse"] ?? "NURSE";
  const response = await fetch("/api/demo/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start", workspace }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Không thể mở phiên Demo.");
  window.location.replace(payload.href ?? demoDestination(account?.key ?? "nurse"));
}

export function DemoEntry({ compactAccount, triggerLabel = "Sử dụng Demo", triggerClassName = "demo-primary-link" }: { accounts: DemoEntryAccount[]; compactAccount?: DemoEntryAccount; triggerLabel?: string; triggerClassName?: string }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function start() { setPending(true); setError(""); try { await enterDemo(compactAccount); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể mở Demo."); setPending(false); } }
  return <span className="demo-entry-direct"><button type="button" className={compactAccount ? undefined : triggerClassName} disabled={pending} onClick={start}>{pending ? <LoaderCircle className="animate-spin"/> : null}{compactAccount?.label ?? triggerLabel}<ArrowRight aria-hidden="true"/></button>{error ? <small role="alert">{error}</small> : null}</span>;
}
