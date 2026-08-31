"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBranding } from "@/components/branding-context";
import { getTranslations } from "@/lib/i18n";

const ROLE_LABEL = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;
type NavItem = { href: string; label: string };
const NAVIGATION: Record<SessionUser["role"], NavItem[]> = {
  ADMIN: [{ href: "/phan-anh", label: "Phản ánh" }, { href: "/quan-ly", label: "Điều hành" }, { href: "/thuc-don", label: "Thực đơn" }, { href: "/lich", label: "Lịch tuần" }, { href: "/kho", label: "Kho" }, { href: "/bao-cao", label: "Báo cáo" }, { href: "/quan-tri", label: "Quản trị" }],
  DIETITIAN: [{ href: "/phan-anh", label: "Phản ánh" }, { href: "/quan-ly", label: "Vận hành" }, { href: "/thuc-don", label: "Thực đơn" }, { href: "/lich", label: "Lịch tuần" }, { href: "/kho", label: "Kho" }, { href: "/bao-cao", label: "Báo cáo" }],
  NURSE: [{ href: "/bao-suat", label: "Báo suất" }, { href: "/lich", label: "Lịch tuần" }, { href: "/bao-cao", label: "Báo cáo" }],
  KITCHEN: [{ href: "/bep", label: "Bếp" }, { href: "/lich", label: "Lịch tuần" }, { href: "/kho", label: "Kho" }, { href: "/bao-cao", label: "Báo cáo" }],
};

function AccountMenu({ user }: { user: SessionUser }) {
  const [leaving, setLeaving] = useState(false);
  const t = getTranslations(user.language);
  async function logout() {
    setLeaving(true);
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.assign("/");
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={`Mở menu tài khoản của ${user.displayName}`} className="top-account">
          <Avatar className="size-8 rounded-md"><AvatarFallback className="rounded-md bg-white font-semibold text-[#085041]">{user.displayName.trim().charAt(0).toUpperCase()}</AvatarFallback></Avatar>
          <span><strong>{user.displayName}</strong><small>{t.role[user.role]}</small></span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-0.5 font-normal"><span className="truncate font-medium">{user.displayName}</span><span className="text-xs text-muted-foreground">{t.role[user.role]}</span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/ho-so"><UserRound className="size-4"/>Hồ sơ của tôi</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/ho-so"><KeyRound className="size-4"/>Đổi mật khẩu</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={leaving} onSelect={logout} className="text-destructive focus:text-destructive"><LogOut className="size-4"/>{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ user, children, workflowStatus, adminNotifications = [] }: { user: SessionUser; children: ReactNode; workflowStatus?: ReactNode; adminNotifications?: Array<{ id: string; label: string; detail: string }> }) {
  const pathname = usePathname();
  const branding = useBranding();
  const t = getTranslations(user.language);
  useEffect(() => {
    if (user.mustChangePassword && pathname !== "/ho-so") window.location.replace("/ho-so?first=1");
  }, [pathname, user.mustChangePassword]);
  if (user.mustChangePassword && pathname !== "/ho-so") return <main className="grid min-h-dvh place-items-center p-6"><p className="text-center text-sm text-muted-foreground">Đang chuyển tới bước đổi mật khẩu bắt buộc…</p></main>;
  const operationsHome = user.role === "ADMIN" || user.role === "DIETITIAN" ? "/quan-ly" : "/";
  const seesOperationsNotifications = true;
  return (
    <div className="app-frame">
      <a href="#main-content" className="skip-link">Đi tới nội dung chính</a>
      <header className="top-shell" style={{ backgroundColor: "var(--brand-surface)", color: "var(--brand-foreground)" }}>
        <Link href={operationsHome} className="top-brand"><span>{branding.logoDataUrl ? <Image src={branding.logoDataUrl} alt="" width={38} height={38} unoptimized /> : branding.shortName}</span><strong>{branding.organizationName}</strong></Link>
        <nav aria-label="Điều hướng chính">{NAVIGATION[user.role].map((item) => { const active = pathname.startsWith(item.href); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>{item.label}</Link>; })}</nav>
        <div className="top-shell-actions">
          {workflowStatus ? <div className="top-workflow-status">{workflowStatus}</div> : null}
          {seesOperationsNotifications && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={adminNotifications.length ? "top-notifications attention" : "top-notifications"} aria-label={`${adminNotifications.length} thông báo vận hành`}>
                  <Bell aria-hidden="true" /><span>{adminNotifications.length || "—"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Thông báo vận hành</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {adminNotifications.length ? adminNotifications.map((item) => <DropdownMenuItem key={item.id} className="grid gap-0.5"><strong>{item.label}</strong><small className="text-muted-foreground">{item.detail}</small></DropdownMenuItem>) : <DropdownMenuItem disabled>Không có cảnh báo cần xử lý.</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <AccountMenu user={user} />
        </div>
      </header>
      <div id="main-content" tabIndex={-1} className="app-main">{children}</div>
    </div>
  );
}
