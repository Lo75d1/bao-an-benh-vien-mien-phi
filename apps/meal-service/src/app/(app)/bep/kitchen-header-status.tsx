"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Language } from "@/lib/i18n";

export function KitchenHeaderStatus({ serviceAt, initialNowIso, liveClock = true, language = "vi" }: { serviceAt: string; initialNowIso: string; liveClock?: boolean; language?: Language }) {
  const [now, setNow] = useState(() => new Date(initialNowIso).getTime());
  useEffect(() => { if (!liveClock) return; const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, [liveClock]);
  const remaining = now ? Math.max(0, new Date(serviceAt).getTime() - now) : 0;
  const hours = Math.floor(remaining / 3_600_000); const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  return <div className="kitchen-header-status"><Clock3/><span>{language === "en" ? "Preparation time remaining" : "Chuẩn bị còn lại"}</span><strong>{remaining ? `${hours ? `${hours} ${language === "en" ? "hr" : "giờ"} ` : ""}${minutes} ${language === "en" ? "min" : "phút"}` : (language === "en" ? "Service time" : "Đến giờ phục vụ")}</strong></div>;
}
