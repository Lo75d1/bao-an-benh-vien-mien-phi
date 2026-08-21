"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";

const ROLE_LABEL = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;
const NAVIGATION = {
  ADMIN: [["/", "Hôm nay", "home"], ["/lich", "Lịch tuần", "calendar"], ["/kho", "Kho", "warehouse"], ["/bao-cao", "Báo cáo", "report"], ["/quan-tri", "Quản trị", "settings"]],
  DIETITIAN: [["/", "Việc tiếp theo", "home"], ["/lich", "Lịch tuần", "calendar"], ["/thuc-don", "Thực đơn", "menu"], ["/kho", "Kho", "warehouse"], ["/bao-cao", "Báo cáo", "report"]],
  NURSE: [["/", "Việc tiếp theo", "home"], ["/bao-suat", "Báo suất", "serving"], ["/lich", "Lịch tuần", "calendar"], ["/bao-cao", "Báo cáo", "report"]],
  KITCHEN: [["/", "Việc tiếp theo", "home"], ["/bep", "Bếp", "kitchen"], ["/lich", "Lịch tuần", "calendar"], ["/kho", "Kho", "warehouse"], ["/bao-cao", "Báo cáo", "report"]],
} as const;

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-6h6v6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="2"/></>,
    serving: <><path d="M5 4v16M5 9h4V4M15 4v7a3 3 0 0 0 3 3h1M18 4v16"/></>,
    kitchen: <><path d="M4 15h16M6 15a6 6 0 0 1 12 0M12 6V4M3 19h18"/></>,
    warehouse: <><path d="m3 9 9-5 9 5v11H3zM3 9h18M8 20v-6h8v6"/></>,
    report: <><path d="M5 21V3h10l4 4v14zM14 3v5h5M9 17v-3m3 3v-6m3 6v-4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6A7 7 0 0 0 8 7.1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 10.4 18l.3 2.6h4L15 18a7 7 0 0 0 1.5-1.1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const items = NAVIGATION[user.role];
  const current = [...items].reverse().find(([href]) => href === "/" ? pathname === "/" : pathname.startsWith(href));
  const logout = async () => { setLeaving(true); await fetch("/api/auth/session", { method: "DELETE" }); window.location.assign("/"); };
  return <div className="app-frame">
    <header className="mobile-topbar"><Link href="/" className="brand-mark"><span>SA</span><strong>Suất ăn bệnh viện</strong></Link><button className="menu-toggle" type="button" aria-expanded={open} aria-controls="app-sidebar" onClick={() => setOpen(!open)}><span className="sr-only">Mở điều hướng</span><i/><i/><i/></button></header>
    {open && <button className="nav-backdrop" aria-label="Đóng điều hướng" onClick={() => setOpen(false)}/>}
    <aside id="app-sidebar" className={`app-sidebar ${open ? "is-open" : ""}`}>
      <Link href="/" className="sidebar-brand" onClick={() => setOpen(false)}><span className="brand-symbol">SA</span><span><strong>Suất ăn</strong><small>Bệnh viện</small></span></Link>
      <div className="nav-caption">Không gian làm việc</div>
      <nav aria-label="Điều hướng chính">{items.map(([href, label, icon]) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link href={href} key={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}><NavIcon name={icon}/><span>{label}</span></Link>; })}</nav>
      <div className="sidebar-user"><div className="user-avatar" aria-hidden="true">{user.displayName.trim().charAt(0).toUpperCase()}</div><div><strong>{user.displayName}</strong><span>{ROLE_LABEL[user.role]}</span></div><button type="button" onClick={logout} disabled={leaving} title="Đăng xuất"><span aria-hidden="true">↗</span><span className="sr-only">Đăng xuất</span></button></div>
    </aside>
    <div className="app-content"><div className="route-bar" aria-label="Breadcrumb"><Link href="/">Trang chủ</Link><span aria-hidden="true">/</span><strong>{current?.[1] ?? "Chi tiết"}</strong><span className="route-role">{ROLE_LABEL[user.role]}</span></div>{children}</div>
  </div>;
}
