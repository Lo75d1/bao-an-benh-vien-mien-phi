"use client";
import { ChefHat, ClipboardList, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { currentNurseWorkflow, NURSE_PHASE_LABEL, type NurseWorkflowMeal } from "@/lib/nurse-workflow";
const steps = [{ phase: "REPORTING", label: "Báo suất ăn", icon: ClipboardList }, { phase: "PREPARING", label: "Bếp chuẩn bị", icon: ChefHat }, { phase: "SERVING", label: "Phục vụ", icon: Utensils }] as const;
export function NurseMealProgress({ meals, completionMinutes }: { meals: NurseWorkflowMeal[]; completionMinutes: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  const current = currentNurseWorkflow(meals, completionMinutes, now); if (!current) return null;
  const ended = current.phase === "ENDED";
  const active = ended ? steps.length : steps.findIndex((step) => step.phase === current.phase);
  return <section className="nurse-progress-card" aria-label={`Tiến trình ${current.meal.name}`}><header><span>{ended ? "Các bữa hôm nay đã kết thúc" : "Suất cần phục vụ hiện tại"}</span><strong>{current.meal.name} — {NURSE_PHASE_LABEL[current.phase]}</strong><small>Chốt {current.meal.cutoffTime} · Phục vụ {current.meal.serviceTime}</small></header><ol>{steps.map(({ phase, label, icon: Icon }, index) => <li key={phase} className={index === active ? "active" : index < active ? "done" : "upcoming"}><span><Icon aria-hidden="true"/><b>{label}</b></span></li>)}</ol></section>;
}
