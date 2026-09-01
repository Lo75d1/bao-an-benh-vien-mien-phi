"use client";
import { ChefHat, ClipboardList, Utensils } from "lucide-react";
import type { ReactNode } from "react";
import { MEAL_PHASE_LABEL, type MealTimePhase } from "@/lib/meal-events";
import type { Language } from "@/lib/i18n";

const steps = [
  { phase: "BEFORE_CUTOFF", label: { vi: "Báo suất ăn", en: "Report servings" }, icon: ClipboardList },
  { phase: "PREPARING", label: { vi: "Bếp chuẩn bị", en: "Kitchen preparation" }, icon: ChefHat },
  { phase: "SERVING", label: { vi: "Phục vụ", en: "Service" }, icon: Utensils },
] as const;

/**
 * Thanh vòng đời của điều dưỡng — component "câm": mốc giờ do trang tính sẵn bằng
 * `mealTimePhase` trong lib/meal-events (nguồn sự thật DUY NHẤT về thời gian).
 * `phase = null` nghĩa là các bữa hôm nay đã xong, vòng kế bắt đầu ở bữa đầu ngày.
 */
export function NurseMealProgress({ mealName, phase, cutoffTime, serviceTime, routeSwitch, language = "vi" }: { mealName: string; phase: MealTimePhase | null; cutoffTime: string; serviceTime: string; routeSwitch?: ReactNode; language?: Language }) {
  const nextCycle = phase === null || phase === "PASSED";
  const active = nextCycle ? 0 : steps.findIndex((step) => step.phase === phase);
  return <section className="nurse-progress-card" aria-label={`${language === "en" ? "Progress" : "Tiến trình"} ${mealName}`}><div className="nurse-progress-context"><header><span>{nextCycle ? (language === "en" ? "Today's meals are complete · next meal" : "Các bữa hôm nay đã kết thúc · bữa kế") : (language === "en" ? "Servings currently due" : "Suất cần phục vụ hiện tại")}</span><strong>{mealName} — {nextCycle ? (language === "en" ? "Not started" : "Chưa tới") : MEAL_PHASE_LABEL[phase]}</strong><small>{language === "en" ? "Cutoff" : "Chốt"} {cutoffTime} · {language === "en" ? "Service" : "Phục vụ"} {serviceTime}</small></header>{routeSwitch}</div><ol>{steps.map(({ phase: stepPhase, label, icon: Icon }, index) => <li key={stepPhase} className={index === active ? "active" : index < active ? "done" : "upcoming"}><span><Icon aria-hidden="true"/><b>{label[language]}</b></span></li>)}</ol></section>;
}
