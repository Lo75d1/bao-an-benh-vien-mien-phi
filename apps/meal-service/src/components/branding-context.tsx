"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BrandingSettings } from "@/lib/branding";

const BrandingContext = createContext<BrandingSettings | null>(null);

export function BrandingProvider({ value, children }: { value: BrandingSettings; children: ReactNode }) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const value = useContext(BrandingContext);
  if (!value) throw new Error("BrandingProvider chưa được khởi tạo.");
  return value;
}
