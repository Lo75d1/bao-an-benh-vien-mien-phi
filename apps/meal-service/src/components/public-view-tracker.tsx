"use client";

import { useEffect } from "react";

export function PublicViewTracker() {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/public/page-view", { method: "POST", credentials: "same-origin", signal: controller.signal });
    return () => controller.abort();
  }, []);
  return null;
}
