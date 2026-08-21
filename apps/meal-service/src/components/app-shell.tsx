"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, ChevronDown, ClipboardList, CookingPot, FileChartColumn, Home, KeyRound, LogOut, Menu, Settings, UserRound, Utensils, Warehouse, type LucideIcon } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, useSidebar } from "@/components/ui/sidebar";

const ROLE_LABEL = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;
type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: "Vận hành" | "Kho & Báo cáo" | "Quản trị"; items: NavItem[] };
const NAVIGATION: Record<SessionUser["role"], NavGroup[]> = {
  ADMIN: [
    { label: "Vận hành", items: [{ href: "/", label: "Hôm nay", icon: Home }, { href: "/lich", label: "Lịch tuần", icon: CalendarDays }] },
    { label: "Kho & Báo cáo", items: [{ href: "/kho", label: "Kho", icon: Warehouse }, { href: "/bao-cao", label: "Báo cáo", icon: FileChartColumn }] },
    { label: "Quản trị", items: [{ href: "/quan-tri", label: "Quản trị", icon: Settings }] },
  ],
  DIETITIAN: [
    { label: "Vận hành", items: [{ href: "/", label: "Việc tiếp theo", icon: Home }, { href: "/lich", label: "Lịch tuần", icon: CalendarDays }, { href: "/thuc-don", label: "Thực đơn", icon: Utensils }] },
    { label: "Kho & Báo cáo", items: [{ href: "/kho", label: "Kho", icon: Warehouse }, { href: "/bao-cao", label: "Báo cáo", icon: FileChartColumn }] },
  ],
  NURSE: [
    { label: "Vận hành", items: [{ href: "/", label: "Việc tiếp theo", icon: Home }, { href: "/bao-suat", label: "Báo suất", icon: ClipboardList }, { href: "/lich", label: "Lịch tuần", icon: CalendarDays }] },
    { label: "Kho & Báo cáo", items: [{ href: "/bao-cao", label: "Báo cáo", icon: FileChartColumn }] },
  ],
  KITCHEN: [
    { label: "Vận hành", items: [{ href: "/", label: "Việc tiếp theo", icon: Home }, { href: "/bep", label: "Bếp", icon: CookingPot }, { href: "/lich", label: "Lịch tuần", icon: CalendarDays }] },
    { label: "Kho & Báo cáo", items: [{ href: "/kho", label: "Kho", icon: Warehouse }, { href: "/bao-cao", label: "Báo cáo", icon: FileChartColumn }] },
  ],
};

function Brand() { return <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-sidebar-foreground"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-sm font-semibold text-[#123c36]">SA</span><span className="grid min-w-0 leading-tight"><strong className="truncate text-sm font-semibold">Suất ăn bệnh viện</strong><span className="truncate text-xs text-sidebar-foreground/65">Điều phối bữa ăn</span></span></Link>; }

function AccountMenu({ user }: { user: SessionUser }) {
  const [leaving, setLeaving] = useState(false);
  async function logout() { setLeaving(true); await fetch("/api/auth/session", { method: "DELETE" }); window.location.assign("/"); }
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2 text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><Avatar className="size-9"><AvatarFallback className="bg-[#d9eee7] font-semibold text-[#085041]">{user.displayName.trim().charAt(0).toUpperCase()}</AvatarFallback></Avatar><span className="grid min-w-0 flex-1 leading-tight"><strong className="truncate text-sm font-medium">{user.displayName}</strong><span className="truncate text-xs opacity-65">{ROLE_LABEL[user.role]}</span></span><ChevronDown className="size-4 opacity-65" /></Button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="w-64"><DropdownMenuLabel className="grid gap-0.5 font-normal"><span className="truncate font-medium">{user.displayName}</span><span className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/ho-so"><UserRound className="size-4" />Hồ sơ của tôi</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/ho-so"><KeyRound className="size-4" />Đổi mật khẩu</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem disabled={leaving} onSelect={logout} className="text-destructive focus:text-destructive"><LogOut className="size-4" />{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function ShellNavigation({ user, pathname }: { user: SessionUser; pathname: string }) {
  const { setOpenMobile } = useSidebar();
  return <><SidebarHeader className="p-3"><Brand /></SidebarHeader><SidebarContent className="px-2 py-2">{NAVIGATION[user.role].map((group) => <SidebarGroup key={group.label} className="py-2"><SidebarGroupLabel className="text-[0.68rem] uppercase tracking-[0.12em]">{group.label}</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{group.items.map(({ href, label, icon: Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <SidebarMenuItem key={href}><SidebarMenuButton asChild isActive={active} className="min-h-11 rounded-lg px-3"><Link href={href} aria-current={active ? "page" : undefined} onClick={() => setOpenMobile(false)}><Icon className="size-[18px]" strokeWidth={1.8} /><span>{label}</span></Link></SidebarMenuButton></SidebarMenuItem>; })}</SidebarMenu></SidebarGroupContent></SidebarGroup>)}</SidebarContent><SidebarFooter className="border-t border-sidebar-border p-3"><AccountMenu user={user} /></SidebarFooter></>;
}

function MobileHeader() { const { setOpenMobile } = useSidebar(); return <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-[#123c36] px-4 text-white lg:hidden"><Brand /><Button variant="ghost" size="icon" className="size-11 text-white hover:bg-white/10 hover:text-white" onClick={() => setOpenMobile(true)} aria-label="Mở điều hướng"><Menu className="size-5" /></Button></header>; }

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname(); const items = NAVIGATION[user.role].flatMap((group) => group.items); const current = [...items].reverse().find(({ href }) => href === "/" ? pathname === "/" : pathname.startsWith(href));
  return <SidebarProvider><Sidebar className="border-r border-sidebar-border"><ShellNavigation user={user} pathname={pathname} /></Sidebar><SidebarInset><MobileHeader /><div className="flex h-12 items-center border-b bg-background/95 px-4 backdrop-blur-sm lg:px-8"><Breadcrumb><BreadcrumbList className="text-xs sm:text-sm"><BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Trang chủ</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{current?.label ?? "Chi tiết"}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><span className="ml-auto hidden rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground sm:inline-flex">{ROLE_LABEL[user.role]}</span></div>{children}</SidebarInset></SidebarProvider>;
}
