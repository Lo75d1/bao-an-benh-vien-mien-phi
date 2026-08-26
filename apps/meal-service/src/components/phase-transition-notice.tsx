"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const labels: Record<string, string> = { BEFORE_CUTOFF: "Báo suất", PREPARING: "Bếp chuẩn bị", SERVING: "Phục vụ", PASSED: "Bữa kế tiếp" };

export function PhaseTransitionNotice({ scope, mealName, phase }: { scope: string; mealName: string; phase: string }) {
  const [previous, setPrevious] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = `meal-phase:${scope}`;
    const stored = sessionStorage.getItem(key);
    sessionStorage.setItem(key, `${mealName}:${phase}`);
    if (stored && stored !== `${mealName}:${phase}`) { const timer = window.setTimeout(() => { setPrevious(stored.split(":").at(-1) ?? null); setOpen(true); }, 0); return () => window.clearTimeout(timer); }
  }, [mealName, phase, scope]);
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Đã chuyển sang {labels[phase] ?? "giai đoạn mới"}</DialogTitle><DialogDescription>{previous ? `${labels[previous] ?? "Giai đoạn trước"} đã kết thúc theo mốc giờ. ` : ""}Hệ thống đang xử lý {mealName}. Trạng thái hoàn tất thực tế vẫn cần người phụ trách xác nhận.</DialogDescription></DialogHeader><button type="button" className="primary-action" onClick={() => setOpen(false)}>Đã hiểu</button></DialogContent></Dialog>;
}
