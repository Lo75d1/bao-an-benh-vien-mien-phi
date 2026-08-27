"use client";

import { useState } from "react";
import { ArrowRight, Check, LoaderCircle, Route, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type DemoEntryAccount = { key: string; label: string; description: string; email?: string; password?: string; href?: string };

const FULL_DEMO = { email: "nurse@demo.local", password: "Demo-Nurse-2026!" };
const ROLE_DESTINATIONS: Record<string, string> = {
  nurse: "/bao-suat",
  dietitian: "/thuc-don",
  kitchen: "/bep",
  sonde: "/bep",
  admin: "/quan-ly",
};
export const demoDestination = (key: string, mode: "single" | "full") => mode === "full" ? "/bao-suat" : ROLE_DESTINATIONS[key] ?? "/";

async function enterDemo(account: DemoEntryAccount, mode: "single" | "full") {
  sessionStorage.setItem("demo-tour-mode", mode);
  sessionStorage.removeItem("demo-guide:NURSE");
  sessionStorage.removeItem("demo-guide:DIETITIAN");
  sessionStorage.removeItem("demo-guide:KITCHEN_NORMAL");
  sessionStorage.removeItem("demo-guide:KITCHEN_SONDE");
  sessionStorage.removeItem("demo-guide:ADMIN");
  for (const email of ["nurse@demo.local", "dietitian@demo.local", "kitchen@demo.local", "sonde@demo.local", "admin@demo.local"]) sessionStorage.removeItem(`demo-guide-index:${email}`);
  if (account.href) { window.location.assign(account.href); return; }
  const credentials = mode === "full" ? FULL_DEMO : account;
  const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(credentials) });
  if (!response.ok) throw new Error("Không thể mở phiên Demo. Vui lòng thử lại.");
  window.location.replace(demoDestination(account.key, mode));
}

export function DemoEntry({ accounts, compactAccount, triggerLabel = "Sử dụng Demo", triggerClassName = "demo-primary-link" }: { accounts: DemoEntryAccount[]; compactAccount?: DemoEntryAccount; triggerLabel?: string; triggerClassName?: string }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function start(account: DemoEntryAccount, mode: "single" | "full") {
    setPending(mode === "full" ? "full" : account.key); setError("");
    try { await enterDemo(account, mode); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể mở Demo."); setPending(null); }
  }
  if (compactAccount) return <button type="button" disabled={pending !== null} onClick={() => start(compactAccount, "single")}>{pending ? <LoaderCircle className="animate-spin"/> : null}{compactAccount.label}<ArrowRight aria-hidden="true"/></button>;
  return <Dialog><DialogTrigger asChild><button type="button" className={triggerClassName}>{triggerLabel}<ArrowRight aria-hidden="true"/></button></DialogTrigger><DialogContent className="demo-entry-dialog max-h-[92vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Chọn cách trải nghiệm hệ thống</DialogTitle><DialogDescription>Hệ thống tự mở đúng tài khoản mẫu và hướng dẫn ngay trên ô cần thao tác. Không cần nhập email hoặc mật khẩu.</DialogDescription></DialogHeader>
    <button className="demo-full-tour" type="button" disabled={pending !== null} onClick={() => start(accounts[1], "full")}><Route aria-hidden="true"/><span><strong>Đi toàn bộ quy trình</strong><small>Điều dưỡng → Dinh dưỡng → Bếp thường → Bếp Sonde → Quản trị</small></span>{pending === "full" ? <LoaderCircle className="animate-spin"/> : <ArrowRight/>}</button>
    <div className="demo-entry-divider"><span>Hoặc chỉ xem một phía</span></div>
    <div className="demo-entry-roles">{accounts.map((account) => <button key={account.key} type="button" disabled={pending !== null} onClick={() => start(account, "single")}><UserRound aria-hidden="true"/><span><strong>{account.label}</strong><small>{account.description}</small></span>{pending === account.key ? <LoaderCircle className="animate-spin"/> : <Check/>}</button>)}</div>
    <p className="demo-entry-error" role="alert">{error}</p>
  </DialogContent></Dialog>;
}
