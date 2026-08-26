"use client";

import { Clock3, RotateCcw } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateDemoClockAction } from "@/app/(app)/demo-clock-actions";

function localInput(iso: string) {
  const value = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function DemoClockControl({ nowIso, simulated }: { nowIso: string; simulated: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const returnTo = `${pathname}${search.size ? `?${search.toString()}` : ""}`;
  return <Dialog><DialogTrigger asChild><button type="button" className={simulated ? "demo-clock-trigger active" : "demo-clock-trigger"}><Clock3/><span>{simulated ? "Giờ Demo" : "Tua thời gian"}</span><strong>{new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(nowIso))}</strong></button></DialogTrigger><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Điều khiển thời gian Demo</DialogTitle><DialogDescription>Chỉ thay đổi “bây giờ” của phiên này. Không tự ghi hoàn tất, bằng chứng hoặc giao nhận.</DialogDescription></DialogHeader><div className="demo-clock-panel"><div className="demo-clock-steps">{[-60, -30, 30, 60].map((minutes) => <form action={updateDemoClockAction} key={minutes}><input type="hidden" name="returnTo" value={returnTo}/><input type="hidden" name="mode" value="STEP"/><button name="minutes" value={minutes}>{minutes > 0 ? "+" : ""}{minutes} phút</button></form>)}</div><form action={updateDemoClockAction} className="demo-clock-set"><input type="hidden" name="returnTo" value={returnTo}/><input type="hidden" name="mode" value="SET"/><label>Chọn mốc giờ<input type="datetime-local" name="now" defaultValue={localInput(nowIso)} required/></label><button className="primary-action">Áp dụng mốc giờ</button></form><form action={updateDemoClockAction}><input type="hidden" name="returnTo" value={returnTo}/><button className="secondary-button demo-clock-real" name="mode" value="REAL"><RotateCcw/>Trở về giờ thật</button></form></div></DialogContent></Dialog>;
}
