"use client";

import { Clock3, RotateCcw } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateDemoClockAction } from "@/app/(app)/demo-clock-actions";
import { readClientLocale } from "@/lib/locale";

function localInput(iso: string) {
  const value = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function DemoClockControl({ nowIso, simulated }: { nowIso: string; simulated: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const locale = readClientLocale();
  const returnTo = `${pathname}${search.size ? `?${search.toString()}` : ""}`;
  const timeLabel = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(nowIso));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={simulated ? "demo-clock-trigger active" : "demo-clock-trigger"}>
          <Clock3 />
          <span>{simulated ? (locale === "vi" ? "Giờ Demo" : "Demo time") : locale === "vi" ? "Tua thời gian" : "Time travel"}</span>
          <strong key={nowIso} className="demo-clock-value" aria-live="polite">
            {timeLabel}
          </strong>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{locale === "vi" ? "Điều khiển thời gian Demo" : "Demo time controls"}</DialogTitle>
          <DialogDescription>
            {locale === "vi"
              ? "Chỉ áp dụng cho trang đang mở và tự trở về giờ thật khi chuyển trang. Bạn có thể thử các giai đoạn trước hoặc sau; thao tác này không thay đổi dữ liệu nghiệp vụ."
              : "It applies only to the page you are viewing and returns to real time when you navigate away. You can try earlier or later stages; this does not change business data."}
          </DialogDescription>
        </DialogHeader>
        <div className="demo-clock-panel">
          <div className="demo-clock-steps">
            {[-60, -30, 30, 60].map((minutes) => (
              <form action={updateDemoClockAction} key={minutes}>
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="currentNow" value={nowIso} />
                <input type="hidden" name="mode" value="STEP" />
                <button name="minutes" value={minutes}>
                  {minutes > 0 ? "+" : ""}
                  {minutes} {locale === "vi" ? "phút" : "min"}
                </button>
              </form>
            ))}
          </div>
          <form action={updateDemoClockAction} className="demo-clock-set">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="mode" value="SET" />
            <label>
              {locale === "vi" ? "Chọn mốc giờ" : "Choose a time"}
              <input type="datetime-local" name="now" defaultValue={localInput(nowIso)} required />
            </label>
            <button className="primary-action">
              {locale === "vi" ? "Áp dụng cho trang này" : "Apply to this page"}
            </button>
          </form>
          <form action={updateDemoClockAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="secondary-button demo-clock-real" name="mode" value="REAL">
              <RotateCcw />
              {locale === "vi" ? "Trở về giờ thật" : "Return to real time"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
