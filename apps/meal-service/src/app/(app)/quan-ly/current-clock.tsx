"use client";

import { useEffect, useState } from "react";
import { getTranslations, readClientLocale } from "@/lib/locale";

const clockFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function CurrentClock() {
  const [now, setNow] = useState<Date | null>(null);
  const locale = readClientLocale();
  const t = getTranslations(locale).management;

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-w-40 text-right leading-tight" aria-label={t.currentClockLabel}>
      <time className="block text-sm font-semibold tabular-nums text-[#123c36]" dateTime={now?.toISOString()} suppressHydrationWarning>
        {now ? clockFormat.format(now) : "—:—:—"}
      </time>
      <span className="mt-0.5 block text-[11px] text-muted-foreground" suppressHydrationWarning>
        {now ? dateFormat.format(now) : t.currentClockFallback}
      </span>
    </div>
  );
}
