"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, ChevronDown, ClipboardList, CookingPot, FileChartColumn, Home, KeyRound, LogOut, Settings, UserRound, Utensils, Warehouse, type LucideIcon } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

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

function Brand() {
  return <Link href="/" className="flex min-w-0 items-center gap-3 rounded-md px-1.5 py-1.5 text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"><span className="grid size-9 shrink-0 place-items-center rounded-md border border-white/20 bg-white text-xs font-semibold tracking-[0.04em] text-[#123c36]">SA</span><span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden"><strong className="truncate text-sm font-semibold">Suất ăn bệnh viện</strong><span className="truncate text-xs text-sidebar-foreground/65">Điều phối bữa ăn</span></span></Link>;
}

function AccountMenu({ user, compact = false, align = "start", side = "top" }: { user: SessionUser; compact?: boolean; align?: "start" | "end"; side?: "top" | "bottom" }) {
  const [leaving, setLeaving] = useState(false);
  async function logout() {
    setLeaving(true);
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.assign("/");
  }

  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" aria-label={`Mở menu tài khoản của ${user.displayName}`} className={cn("h-auto min-w-0 justify-start gap-3 px-2 py-2 text-left", compact ? "w-auto text-foreground hover:bg-secondary" : "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0")}><Avatar className="size-8 shrink-0 rounded-md"><AvatarFallback className="rounded-md bg-[#d9eee7] font-semibold text-[#085041]">{user.displayName.trim().charAt(0).toUpperCase()}</AvatarFallback></Avatar><span className={cn("grid min-w-0 flex-1 leading-tight", !compact && "group-data-[collapsible=icon]:hidden", compact && "hidden sm:grid")}><strong className="max-w-40 truncate text-sm font-medium">{user.displayName}</strong><span className="truncate text-xs opacity-65">{ROLE_LABEL[user.role]}</span></span><ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 opacity-60", !compact && "group-data-[collapsible=icon]:hidden", compact && "hidden sm:block")} /></Button></DropdownMenuTrigger><DropdownMenuContent side={side} align={align} className="w-64"><DropdownMenuLabel className="grid gap-0.5 font-normal"><span className="truncate font-medium">{user.displayName}</span><span className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/ho-so"><UserRound aria-hidden="true" className="size-4" />Hồ sơ của tôi</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/ho-so"><KeyRound aria-hidden="true" className="size-4" />Đổi mật khẩu</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem disabled={leaving} onSelect={logout} className="text-destructive focus:text-destructive"><LogOut aria-hidden="true" className="size-4" />{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function ShellNavigation({ user, pathname }: { user: SessionUser; pathname: string }) {
  const { setOpenMobile } = useSidebar();
  return <><SidebarHeader className="border-b border-sidebar-border p-2"><Brand /></SidebarHeader><SidebarContent className="px-1 py-2"><nav aria-label="Điều hướng chính">{NAVIGATION[user.role].map((group) => <SidebarGroup key={group.label} className="py-1.5"><SidebarGroupLabel className="text-[0.68rem] uppercase tracking-[0.1em]">{group.label}</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{group.items.map(({ href, label, icon: Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <SidebarMenuItem key={href}><SidebarMenuButton asChild isActive={active} tooltip={label}><Link href={href} aria-current={active ? "page" : undefined} onClick={() => setOpenMobile(false)}><Icon aria-hidden="true" strokeWidth={1.8} /><span>{label}</span></Link></SidebarMenuButton></SidebarMenuItem>; })}</SidebarMenu></SidebarGroupContent></SidebarGroup>)}</nav></SidebarContent><SidebarFooter className="border-t border-sidebar-border p-2"><AccountMenu user={user} /></SidebarFooter></>;
}

function ShellHeader({ user, currentLabel }: { user: SessionUser; currentLabel: string }) {
  return <header className="sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm sm:px-4 lg:px-6"><SidebarTrigger /><span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border sm:block" /><Breadcrumb className="min-w-0"><BreadcrumbList className="flex-nowrap text-xs sm:text-sm"><BreadcrumbItem className="hidden sm:inline-flex"><BreadcrumbLink asChild><Link href="/">Trang chủ</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator className="hidden sm:list-item" /><BreadcrumbItem className="min-w-0"><BreadcrumbPage className="block truncate font-medium">{currentLabel}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><div className="ml-auto"><AccountMenu user={user} compact align="end" side="bottom" /></div></header>;
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const items = NAVIGATION[user.role].flatMap((group) => group.items);
  const current = [...items].reverse().find(({ href }) => href === "/" ? pathname === "/" : pathname.startsWith(href));

  return <SidebarProvider><a href="#main-content" className="skip-link">Đi tới nội dung chính</a><Sidebar collapsible="icon"><ShellNavigation user={user} pathname={pathname} /><SidebarRail /></Sidebar><SidebarInset><ShellHeader user={user} currentLabel={current?.label ?? "Chi tiết"} /><div id="main-content" tabIndex={-1} className="min-w-0 flex-1">{children}</div></SidebarInset></SidebarProvider>;
}
