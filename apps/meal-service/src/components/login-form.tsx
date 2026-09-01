"use client";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workspaceForRole } from "@/lib/role-workspace";
import { getTranslations, type Language } from "@/lib/i18n";
export function LoginForm({ language = "vi" }: { language?: Language }) {
  const t = getTranslations(language).public;
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function login(email: string, password: string) { setPending(true); setError(""); const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }); const payload = await response.json().catch(() => null); if (!response.ok) { setError(payload?.error ?? t.loginError); setPending(false); return; } window.location.assign(payload?.user?.mustChangePassword ? "/ho-so?first=1" : workspaceForRole(payload?.user?.role)); }
  return <form action={(formData) => login(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""))} className="grid gap-5"><div className="grid gap-2"><Label htmlFor="email">{t.staffEmail}</Label><Input id="email" name="email" type="email" autoComplete="username" spellCheck={false} required className="h-12" /></div><div className="grid gap-2"><Label htmlFor="password">{t.password}</Label><Input id="password" name="password" type="password" autoComplete="current-password" minLength={10} required className="h-12" /></div><p className="min-h-0 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive empty:hidden" role="alert" aria-live="polite">{error}</p><Button type="submit" disabled={pending} className="h-12 w-full bg-[#0f6e56] text-white hover:bg-[#0b5f4a] active:scale-[0.99]">{pending ? <><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t.loggingIn}</> : <>{t.login}<ArrowRight className="size-4" aria-hidden="true" /></>}</Button></form>;
}
