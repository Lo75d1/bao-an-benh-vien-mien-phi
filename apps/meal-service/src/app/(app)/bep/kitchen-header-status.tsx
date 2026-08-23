"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

export function KitchenHeaderStatus({ serviceAt }: { serviceAt: string }) {
  const [now, setNow] = useState(0);
  useEffect(() => { const immediate = window.setTimeout(() => setNow(Date.now()), 0); const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => { window.clearTimeout(immediate); window.clearInterval(timer); }; }, []);
  const remaining = now ? Math.max(0, new Date(serviceAt).getTime() - now) : 0;
  const hours = Math.floor(remaining / 3_600_000); const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  return <div className="kitchen-header-status"><Clock3/><span>Chuẩn bị còn lại</span><strong>{!now ? "—" : remaining ? `${hours ? `${hours} giờ ` : ""}${minutes} phút` : "Đến giờ phục vụ"}</strong></div>;
}
