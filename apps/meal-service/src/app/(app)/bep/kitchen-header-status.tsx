"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

export function KitchenHeaderStatus({ serviceAt, initialNowIso, liveClock = true }: { serviceAt: string; initialNowIso: string; liveClock?: boolean }) {
  const [now, setNow] = useState(() => new Date(initialNowIso).getTime());
  useEffect(() => { if (!liveClock) return; const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, [liveClock]);
  const remaining = now ? Math.max(0, new Date(serviceAt).getTime() - now) : 0;
  const hours = Math.floor(remaining / 3_600_000); const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  return <div className="kitchen-header-status"><Clock3/><span>Chuẩn bị còn lại</span><strong>{remaining ? `${hours ? `${hours} giờ ` : ""}${minutes} phút` : "Đến giờ phục vụ"}</strong></div>;
}
