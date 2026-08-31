"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Language } from "@/lib/i18n";

const labels: Record<string, string> = { BEFORE_CUTOFF: "Báo suất", PREPARING: "Bếp chuẩn bị", SERVING: "Phục vụ", PASSED: "Bữa kế tiếp" };

export function PhaseTransitionNotice({ scope, mealName, phase, language = "vi" }: { scope: string; mealName: string; phase: string; language?: Language }) {
  const [previous, setPrevious] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = `meal-phase:${scope}`;
    const stored = sessionStorage.getItem(key);
    sessionStorage.setItem(key, `${mealName}:${phase}`);
    if (stored && stored !== `${mealName}:${phase}`) { const timer = window.setTimeout(() => { setPrevious(stored.split(":").at(-1) ?? null); setOpen(true); }, 0); return () => window.clearTimeout(timer); }
  }, [mealName, phase, scope]);
  const phaseLabels = language === "en" ? { BEFORE_CUTOFF: "meal reporting", PREPARING: "kitchen preparation", SERVING: "service", PASSED: "the next meal" } : labels;
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{language === "en" ? `Moved to ${phaseLabels[phase] ?? "a new phase"}` : `Đã chuyển sang ${phaseLabels[phase] ?? "giai đoạn mới"}`}</DialogTitle><DialogDescription>{language === "en" ? `${previous ? `${phaseLabels[previous] ?? "The previous phase"} ended at its scheduled time. ` : ""}The system is processing ${mealName}. Actual completion still requires confirmation by the responsible staff member.` : `${previous ? `${phaseLabels[previous] ?? "Giai đoạn trước"} đã kết thúc theo mốc giờ. ` : ""}Hệ thống đang xử lý ${mealName}. Trạng thái hoàn tất thực tế vẫn cần người phụ trách xác nhận.`}</DialogDescription></DialogHeader><button type="button" className="primary-action" onClick={() => setOpen(false)}>{language === "en" ? "Understood" : "Đã hiểu"}</button></DialogContent></Dialog>;
}
