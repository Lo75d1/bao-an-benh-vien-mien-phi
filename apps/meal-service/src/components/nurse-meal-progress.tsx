"use client";
import { ChefHat, ClipboardList, Utensils } from "lucide-react";
import type { ReactNode } from "react";
import { MEAL_PHASE_LABEL, type MealTimePhase } from "@/lib/meal-events";

const steps = [
  { phase: "BEFORE_CUTOFF", label: "Báo suất ăn", icon: ClipboardList },
  { phase: "PREPARING", label: "Bếp chuẩn bị", icon: ChefHat },
  { phase: "SERVING", label: "Phục vụ", icon: Utensils },
] as const;

/**
 * Thanh vòng đời của điều dưỡng — component "câm": mốc giờ do trang tính sẵn bằng
 * `mealTimePhase` trong lib/meal-events (nguồn sự thật DUY NHẤT về thời gian).
 * `phase = null` nghĩa là các bữa hôm nay đã xong, vòng kế bắt đầu ở bữa đầu ngày.
 */
export function NurseMealProgress({ mealName, phase, cutoffTime, serviceTime, routeSwitch }: { mealName: string; phase: MealTimePhase | null; cutoffTime: string; serviceTime: string; routeSwitch?: ReactNode }) {
  const nextCycle = phase === null || phase === "PASSED";
  const active = nextCycle ? 0 : steps.findIndex((step) => step.phase === phase);
  return <section className="nurse-progress-card" aria-label={`Tiến trình ${mealName}`}><div className="nurse-progress-context"><header><span>{nextCycle ? "Các bữa hôm nay đã kết thúc · bữa kế" : "Suất cần phục vụ hiện tại"}</span><strong>{mealName} — {nextCycle ? "Chưa tới" : MEAL_PHASE_LABEL[phase]}</strong><small>Chốt {cutoffTime} · Phục vụ {serviceTime}</small></header>{routeSwitch}</div><ol>{steps.map(({ phase: stepPhase, label, icon: Icon }, index) => <li key={stepPhase} className={index === active ? "active" : index < active ? "done" : "upcoming"}><span><Icon aria-hidden="true"/><b>{label}</b></span></li>)}</ol></section>;
}
