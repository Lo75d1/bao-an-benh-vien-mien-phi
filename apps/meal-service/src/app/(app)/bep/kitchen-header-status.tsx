"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { getTranslations, readClientLocale } from "@/lib/locale";

export function KitchenHeaderStatus({ serviceAt, initialNowIso, liveClock = true }: { serviceAt: string; initialNowIso: string; liveClock?: boolean }) {
  const t = getTranslations(readClientLocale()).management.kitchenHeaderStatus;
  const [now, setNow] = useState(() => new Date(initialNowIso).getTime());
  useEffect(() => { if (!liveClock) return; const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, [liveClock]);
  const remaining = now ? Math.max(0, new Date(serviceAt).getTime() - now) : 0;
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  const remainingLabel = [
    hours ? t.hours.replace("{count}", String(hours)) : null,
    minutes ? t.minutes.replace("{count}", String(minutes)) : null,
  ].filter(Boolean).join(" ");
  return <div className="kitchen-header-status"><Clock3/><span>{t.label}</span><strong>{remaining ? remainingLabel : t.serviceTime}</strong></div>;
}
