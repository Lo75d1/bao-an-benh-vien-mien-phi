"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workspaceForRole } from "@/lib/role-workspace";
import { getTranslations, type Locale } from "@/lib/locale";

type DemoAccount = { label: string; email: string; password: string };

export function LoginForm({
  demoAccounts = [],
  locale = "vi",
}: {
  demoAccounts?: DemoAccount[];
  locale?: Locale;
}) {
  const t = getTranslations(locale).public;
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function login(email: string, password: string) {
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? t.loginError);
      setPending(false);
      return;
    }
    window.location.assign(workspaceForRole(payload?.user?.role));
  }

  return (
    <>
      <form
        action={(formData) =>
          login(
            String(formData.get("email") ?? ""),
            String(formData.get("password") ?? ""),
          )
        }
        className="grid gap-5"
      >
        <div className="grid gap-2">
          <Label htmlFor="email">{t.staffEmail}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            spellCheck={false}
            required
            className="h-12"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{t.password}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={10}
            required
            className="h-12"
          />
        </div>
        <p
          className="min-h-0 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive empty:hidden"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
        <Button
          type="submit"
          disabled={pending}
          className="h-12 w-full bg-[#0f6e56] text-white hover:bg-[#0b5f4a] active:scale-[0.99]"
        >
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {t.loggingIn}
            </>
          ) : (
            <>
              {t.login}
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
      {demoAccounts.length > 0 && (
        <div className="demo-logins">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t.demoQuickLogin}
          </p>
          <div className="demo-login-grid grid grid-cols-2 gap-2 max-[440px]:grid-cols-1">
            {demoAccounts.map((account) => (
              <Button
                key={account.email}
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => login(account.email, account.password)}
                className="demo-login-btn h-auto min-h-11 whitespace-normal px-3 py-2 text-sm"
              >
                {account.label}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t.demoQuickLoginHelp}
          </p>
        </div>
      )}
    </>
  );
}
