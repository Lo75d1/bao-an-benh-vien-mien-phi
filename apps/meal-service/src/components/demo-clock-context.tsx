"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type DemoClockValue = { nowIso: string; simulated: boolean } | null;
const DemoClockContext = createContext<DemoClockValue>(null);

export function DemoClockProvider({ value, children }: { value: DemoClockValue; children: ReactNode }) {
  const previousNow = useRef<string | null>(null);
  const [changedTime, setChangedTime] = useState<string | null>(null);
  useEffect(() => {
    const nextNow = value?.nowIso ?? null;
    if (!previousNow.current) { previousNow.current = nextNow; return; }
    if (!nextNow || previousNow.current === nextNow) return;
    previousNow.current = nextNow;
    const label = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(nextNow));
    setChangedTime(label);
    document.documentElement.setAttribute("data-demo-time-transition", "true");
    const timer = window.setTimeout(() => {
      setChangedTime(null);
      document.documentElement.removeAttribute("data-demo-time-transition");
    }, 650);
    return () => {
      window.clearTimeout(timer);
      document.documentElement.removeAttribute("data-demo-time-transition");
    };
  }, [value?.nowIso]);
  return <DemoClockContext.Provider value={value}>{children}{changedTime ? <div className="demo-time-transition" role="status" aria-live="polite"><span>Đã chuyển giờ Demo</span><strong>{changedTime}</strong></div> : null}</DemoClockContext.Provider>;
}

export function useDemoClock() { return useContext(DemoClockContext); }
