"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3.5rem";

type SidebarContextValue = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return isMobile;
}

function SidebarProvider({ defaultOpen = true, open: openProp, onOpenChange, className, style, children, ...props }: React.ComponentProps<"div"> & { defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback((value: boolean) => {
    onOpenChange?.(value);
    if (!onOpenChange) _setOpen(value);
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
  }, [onOpenChange]);
  const toggleSidebar = React.useCallback(() => isMobile ? setOpenMobile((value) => !value) : setOpen(!open), [isMobile, open, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state: SidebarContextValue["state"] = open ? "expanded" : "collapsed";
  const value = React.useMemo<SidebarContextValue>(() => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }), [state, open, setOpen, isMobile, openMobile, toggleSidebar]);

  return <SidebarContext.Provider value={value}><TooltipProvider delayDuration={150}><div data-slot="sidebar-wrapper" style={{ "--sidebar-width": SIDEBAR_WIDTH, "--sidebar-width-icon": SIDEBAR_WIDTH_ICON, ...style } as React.CSSProperties} className={cn("group/sidebar-wrapper flex min-h-svh w-full bg-background", className)} {...props}>{children}</div></TooltipProvider></SidebarContext.Provider>;
}

function Sidebar({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }: React.ComponentProps<"div"> & { side?: "left" | "right"; variant?: "sidebar" | "floating" | "inset"; collapsible?: "offcanvas" | "icon" | "none" }) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  if (collapsible === "none") return <div data-slot="sidebar" className={cn("flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground", className)} {...props}>{children}</div>;

  if (isMobile) return <Sheet open={openMobile} onOpenChange={setOpenMobile}><SheetContent data-sidebar="sidebar" data-slot="sidebar" side={side} className="w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground shadow-none [&>button]:size-11 [&>button]:text-sidebar-foreground" style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}><SheetHeader className="sr-only"><SheetTitle>Điều hướng</SheetTitle><SheetDescription>Chọn khu vực làm việc</SheetDescription></SheetHeader><div className="flex size-full flex-col">{children}</div></SheetContent></Sheet>;

  return <div className="group peer hidden text-sidebar-foreground lg:block" data-state={state} data-collapsible={state === "collapsed" ? collapsible : ""} data-variant={variant} data-side={side} data-slot="sidebar">
    <div data-slot="sidebar-gap" className={cn("relative w-[var(--sidebar-width)] bg-transparent", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem)]" : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]")} />
    <div data-slot="sidebar-container" className={cn("fixed inset-y-0 z-30 hidden h-svh w-[var(--sidebar-width)] lg:flex", side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]", variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem)]" : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l", className)} {...props}>
      <div data-sidebar="sidebar" data-slot="sidebar-inner" className="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-xl group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border">{children}</div>
    </div>
  </div>;
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  return <Button data-sidebar="trigger" data-slot="sidebar-trigger" variant="ghost" size="icon" aria-label="Mở hoặc thu gọn thanh điều hướng" className={cn("size-10 lg:size-9", className)} onClick={(event) => { onClick?.(event); toggleSidebar(); }} {...props}><PanelLeft aria-hidden="true" /><span className="sr-only">Mở hoặc thu gọn thanh điều hướng</span></Button>;
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return <button data-sidebar="rail" data-slot="sidebar-rail" aria-label="Thu gọn thanh điều hướng" title="Thu gọn thanh điều hướng" tabIndex={-1} onClick={toggleSidebar} className={cn("absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 touch-manipulation after:absolute after:inset-y-0 after:left-1/2 after:w-px hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 lg:flex", className)} {...props} />;
}

function SidebarInset({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="sidebar-inset" className={cn("relative flex min-w-0 flex-1 flex-col bg-background", className)} {...props} />; }
function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="sidebar-header" className={cn("flex flex-col gap-2 p-2", className)} {...props} />; }
function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="sidebar-footer" className={cn("flex flex-col gap-2 p-2", className)} {...props} />; }
function SidebarContent({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="sidebar-content" className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)} {...props} />; }
function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="sidebar-group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />; }
function SidebarGroupLabel({ className, asChild = false, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) { const Comp = asChild ? Slot : "div"; return <Comp data-slot="sidebar-group-label" className={cn("flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/65 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", className)} {...props} />; }
function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="sidebar-group-content" className={cn("w-full text-sm", className)} {...props} />; }
function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) { return <ul data-slot="sidebar-menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />; }
function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) { return <li data-slot="sidebar-menu-item" className={cn("group/menu-item relative", className)} {...props} />; }

function SidebarMenuButton({ asChild = false, isActive = false, tooltip, className, ...props }: React.ComponentProps<"button"> & { asChild?: boolean; isActive?: boolean; tooltip?: string | React.ComponentProps<typeof TooltipContent> }) {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();
  const button = <Comp data-slot="sidebar-menu-button" data-sidebar="menu-button" data-active={isActive} className={cn("flex min-h-10 w-full min-w-0 items-center gap-3 overflow-hidden rounded-md px-2.5 text-left text-sm font-medium outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring active:bg-sidebar-accent data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 [&>span:last-child]:truncate [&>svg]:size-[1.125rem] [&>svg]:shrink-0", className)} {...props} />;
  if (!tooltip) return button;
  const content = typeof tooltip === "string" ? { children: tooltip } : tooltip;
  return <Tooltip><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent side="right" align="center" hidden={state !== "collapsed" || isMobile} {...content} /></Tooltip>;
}

export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar };
