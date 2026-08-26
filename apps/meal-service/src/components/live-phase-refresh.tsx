"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Làm mới dữ liệu nghiệp vụ; mọi giai đoạn vẫn được tính ở meal-events.ts. */
export function LivePhaseRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [enabled, router]);
  return null;
}
