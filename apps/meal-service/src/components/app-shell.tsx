"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, ChevronDown, ExternalLink, KeyRound, LogOut, UserRound } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranding } from "@/components/branding-context";
import { DemoClockControl } from "@/components/demo-clock-control";
import { DemoGuide } from "@/components/demo-guide";
import { useDemoClock } from "@/components/demo-clock-context";
import { DemoWorkspaceSwitcher } from "@/components/demo-workspace-switcher";
import { StaffLanguageSwitcher } from "@/components/language-switcher";
import { getTranslations, readClientLocale } from "@/lib/locale";

type NavItem = { href: string; labelKey: keyof ReturnType<typeof getTranslations>["nav"] };
const NAVIGATION: Record<SessionUser["role"], NavItem[]> = {
  ADMIN: [
    { href: "/quan-ly", labelKey: "operations" },
    { href: "/thuc-don", labelKey: "menu" },
    { href: "/lich", labelKey: "weekly" },
    { href: "/kho", labelKey: "warehouse" },
    { href: "/bao-cao", labelKey: "reports" },
    { href: "/quan-tri", labelKey: "admin" },
  ],
  DIETITIAN: [
    { href: "/quan-ly", labelKey: "operationsDietitian" },
    { href: "/thuc-don", labelKey: "menu" },
    { href: "/lich", labelKey: "weekly" },
    { href: "/kho", labelKey: "warehouse" },
    { href: "/bao-cao", labelKey: "reports" },
  ],
  NURSE: [
    { href: "/bao-suat", labelKey: "servings" },
    { href: "/lich", labelKey: "weekly" },
    { href: "/bao-cao", labelKey: "reports" },
  ],
  KITCHEN: [
    { href: "/bep", labelKey: "kitchen" },
    { href: "/lich", labelKey: "weekly" },
    { href: "/kho", labelKey: "warehouse" },
    { href: "/bao-cao", labelKey: "reports" },
  ],
};

function AccountMenu({ user, locale }: { user: SessionUser; locale: ReturnType<typeof readClientLocale> }) {
  const [leaving, setLeaving] = useState(false);
  const t = getTranslations(locale);

  async function logout() {
    setLeaving(true);
    await fetch(user.demoSessionId ? "/api/demo/session" : "/api/auth/session", { method: "DELETE" });
    window.location.assign(user.demoSessionId ? "/demo" : "/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={`${t.account.language} ${user.displayName}`} className="top-account">
          <Avatar className="size-8 rounded-md">
            <AvatarFallback className="rounded-md bg-white font-semibold text-[#085041]">
              {user.displayName.trim().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>
            <strong>{user.displayName}</strong>
            <small>{t.role[user.role]}</small>
          </span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-0.5 font-normal">
          <span className="truncate font-medium">{user.displayName}</span>
          <span className="text-xs text-muted-foreground">{t.role[user.role]}</span>
        </DropdownMenuLabel>
        {!user.demoSessionId ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/ho-so">
                <UserRound className="size-4" />
                {t.account.profile}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/ho-so">
                <KeyRound className="size-4" />
                {t.account.changePassword}
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={leaving}
          onSelect={logout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" />
          {leaving ? t.account.loggingOut : t.account.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  user,
  children,
  workflowStatus,
  adminNotifications = [],
  demoClock,
}: {
  user: SessionUser;
  children: ReactNode;
  workflowStatus?: ReactNode;
  adminNotifications?: Array<{ id: string; label: string; detail: string }>;
  demoClock?: { nowIso: string; simulated: boolean };
}) {
  const pathname = usePathname();
  const branding = useBranding();
  const inheritedDemoClock = useDemoClock();
  const activeDemoClock = demoClock ?? inheritedDemoClock ?? undefined;
  const [locale] = useState(() => readClientLocale());
  const t = getTranslations(locale);
  const operationsHome = activeDemoClock
    ? "/demo"
    : user.role === "ADMIN" || user.role === "DIETITIAN"
      ? "/quan-ly"
      : "/";
  const seesOperationsNotifications = true;

  return (
    <div className="app-frame">
      <a href="#main-content" className="skip-link">
        {t.public.intro}
      </a>
      {user.demoWorkspace ? <DemoWorkspaceSwitcher active={user.demoWorkspace} /> : null}
      <header
        className="top-shell"
        style={{
          backgroundColor: "var(--brand-surface)",
          color: "var(--brand-foreground)",
        }}
      >
        <Link href={operationsHome} className="top-brand">
          <span>
            {branding.logoDataUrl ? (
              <Image src={branding.logoDataUrl} alt="" width={38} height={38} unoptimized />
            ) : (
              branding.shortName
            )}
          </span>
          <strong>{branding.organizationName}</strong>
        </Link>
        <nav aria-label={t.public.title}>
          {NAVIGATION[user.role].map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                data-demo-nav={item.href}
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
              >
                {t.nav[item.labelKey]}
              </Link>
            );
          })}
        </nav>
        <div className="top-shell-actions">
          {activeDemoClock ? <span className="demo-system-label">DEMO</span> : null}
          {activeDemoClock ? (
            <a
              className="top-project-link"
              href="https://dinhduong2598.food"
              target="_blank"
              rel="noreferrer"
            >
              <span>Dinh dưỡng 2598</span>
              <ExternalLink aria-hidden="true" />
            </a>
          ) : null}
          <StaffLanguageSwitcher current={locale} />
          {activeDemoClock ? <DemoClockControl {...activeDemoClock} /> : null}
          {workflowStatus ? (
            <div className="top-workflow-status">{workflowStatus}</div>
          ) : null}
          {seesOperationsNotifications && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={
                    adminNotifications.length
                      ? "top-notifications attention"
                      : "top-notifications"
                  }
                  aria-label={`${adminNotifications.length} ${t.nav.reports}`}
                >
                  <Bell aria-hidden="true" />
                  <span>{adminNotifications.length || "—"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>{t.nav.reports}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {adminNotifications.length ? (
                  adminNotifications.map((item) => (
                    <DropdownMenuItem key={item.id} className="grid gap-0.5">
                      <strong>{item.label}</strong>
                      <small className="text-muted-foreground">{item.detail}</small>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>{t.public.unavailable}</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <AccountMenu user={user} locale={locale} />
        </div>
      </header>
      <div id="main-content" tabIndex={-1} className="app-main">
        {children}
      </div>
      {activeDemoClock ? <DemoGuide user={user} /> : null}
    </div>
  );
}
