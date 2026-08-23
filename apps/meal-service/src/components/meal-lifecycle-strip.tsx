"use client";

import type { Role } from "@prisma/client";
import { Check, ChefHat, ClipboardList, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { displayMealState, rollupMealEventStatus } from "@/lib/meal-events";
import type { ManagementDay, ManagementMeal } from "@/lib/management";

const steps = [
  { label: "Báo suất", icon: ClipboardList },
  { label: "Bếp chuẩn bị", icon: ChefHat },
  { label: "Phục vụ", icon: Utensils },
  { label: "Kết thúc", icon: Check },
];

function statusOf(meal: ManagementMeal) {
  return rollupMealEventStatus(meal.diets.map((diet) => diet.status));
}

export function MealLifecycleStrip({ data, role, selectedMealId }: { data: ManagementDay; role: Role; selectedMealId?: string }) {
  const [now, setNow] = useState(() => new Date(data.generatedAt));
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  const current = useMemo(() => data.meals.find((meal) => meal.id === selectedMealId) ?? data.meals.find((meal) => displayMealState(new Date(`${data.date}T00:00:00.000Z`), meal.cutoffTime, meal.serviceTime, statusOf(meal), now)?.isCurrent) ?? data.meals.find((meal) => statusOf(meal) !== "SERVED") ?? data.meals.at(-1), [data, now, selectedMealId]);
  if (!current) return null;
  const state = displayMealState(new Date(`${data.date}T00:00:00.000Z`), current.cutoffTime, current.serviceTime, statusOf(current), now);
  const ended = state?.key === "SERVED" || state?.key === "INCOMPLETE";
  const activeIndex = ended ? 3 : state?.key === "RECEIVING" || state?.key === "UPCOMING" ? 0 : state?.key === "PREPARING" || state?.key === "COOKING" ? 1 : 2;
  const focus = role === "NURSE" ? 0 : role === "KITCHEN" ? 1 : role === "DIETITIAN" ? 0 : -1;
  const nextMeal = ended ? data.meals[data.meals.findIndex((meal) => meal.id === current.id) + 1] : undefined;
  return <section className="meal-lifecycle shared-lifecycle" aria-label={`Vòng đời bữa ${current.name}`}><header><div><span>Đang theo dõi</span><strong>{current.name} · {state?.label ?? "—"}</strong></div><p>Chốt {current.cutoffTime} · Phục vụ {current.serviceTime}{nextMeal ? ` · ↻ Bữa kế: ${nextMeal.name} (chốt ${nextMeal.cutoffTime})` : ""}</p></header><ol>{steps.map(({ label, icon: Icon }, index) => <li key={label} className={`${index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming"}${index === 3 && state?.key === "INCOMPLETE" ? " warn" : ""}${index === focus ? " role-focus" : ""}`}><span>{index < activeIndex ? <Check aria-hidden="true"/> : <Icon aria-hidden="true"/>}</span><strong>{label}</strong></li>)}</ol></section>;
}
