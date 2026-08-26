"use client";

import { createContext, useContext, type ReactNode } from "react";

export type DemoClockValue = { nowIso: string; simulated: boolean } | null;
const DemoClockContext = createContext<DemoClockValue>(null);

export function DemoClockProvider({ value, children }: { value: DemoClockValue; children: ReactNode }) {
  return <DemoClockContext.Provider value={value}>{children}</DemoClockContext.Provider>;
}

export function useDemoClock() { return useContext(DemoClockContext); }
