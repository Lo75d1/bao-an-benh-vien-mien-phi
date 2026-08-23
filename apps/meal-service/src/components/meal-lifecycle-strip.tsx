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
];

function statusOf(meal: ManagementMeal) {
  return rollupMealEventStatus(meal.diets.map((diet) => diet.status));
}

export function MealLifecycleStrip({ data, role, selectedMealId }: { data: ManagementDay; role: Role; selectedMealId?: string }) {
  const [now, setNow] = useState(() => new Date(data.generatedAt));
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  const dayDate = useMemo(() => new Date(`${data.date}T00:00:00.000Z`), [data.date]);
  const picked = useMemo(() => {
    const stateOf = (meal: ManagementMeal) => displayMealState(dayDate, meal.cutoffTime, meal.serviceTime, statusOf(meal), now);
    const chosen = selectedMealId ? data.meals.find((meal) => meal.id === selectedMealId) : undefined;
    if (chosen) return { meal: chosen, nextCycle: false };
    const running = data.meals.find((meal) => stateOf(meal)?.isCurrent);
    if (running) return { meal: running, nextCycle: false };
    const upcoming = data.meals.find((meal) => { const key = stateOf(meal)?.key; return key === "RECEIVING" || key === "UPCOMING"; });
    if (upcoming) return { meal: upcoming, nextCycle: false };
    // Hết bữa trong ngày: vòng phục vụ chạy tiếp sang bữa đầu của ngày mai.
    return data.meals[0] ? { meal: data.meals[0], nextCycle: true } : undefined;
  }, [data.meals, dayDate, now, selectedMealId]);
  if (!picked) return null;
  const { meal: current, nextCycle } = picked;
  const state = displayMealState(dayDate, current.cutoffTime, current.serviceTime, statusOf(current), now);
  // Bữa đã qua (đã phục vụ hoặc quá giờ): cả ba chặng đều xong, không chặng nào đang chạy.
  const ended = !nextCycle && (state?.key === "SERVED" || state?.key === "INCOMPLETE");
  const activeIndex = ended ? steps.length : nextCycle || state?.key === "RECEIVING" || state?.key === "UPCOMING" ? 0 : state?.key === "PREPARING" || state?.key === "COOKING" ? 1 : 2;
  const focus = role === "NURSE" ? 0 : role === "KITCHEN" ? 1 : role === "DIETITIAN" ? 0 : -1;
  return <section className="meal-lifecycle shared-lifecycle" aria-label={`Vòng đời bữa ${current.name}`}><header><div><span>{nextCycle ? "Các bữa hôm nay đã kết thúc · bữa kế" : "Đang theo dõi"}</span><strong>{current.name} · {nextCycle ? "Chưa tới" : state?.label ?? "—"}</strong></div><p>{nextCycle ? "Ngày mai · " : ""}Chốt {current.cutoffTime} · Phục vụ {current.serviceTime}</p></header><ol>{steps.map(({ label, icon: Icon }, index) => <li key={label} className={`${index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming"}${index === focus ? " role-focus" : ""}`}><span>{index < activeIndex ? <Check aria-hidden="true"/> : <Icon aria-hidden="true"/>}</span><strong>{label}</strong></li>)}</ol></section>;
}
