"use client";

import type { Role } from "@prisma/client";
import { ChefHat, ClipboardList, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { displayMealState, pickLifecycleMeal, rollupMealEventStatus } from "@/lib/meal-events";
import type { ManagementDay, ManagementMeal } from "@/lib/management";

const steps = [
  { label: "Báo suất", icon: ClipboardList },
  { label: "Bếp chuẩn bị", icon: ChefHat },
  { label: "Phục vụ", icon: Utensils },
];

function statusOf(meal: ManagementMeal) {
  return rollupMealEventStatus(meal.diets.map((diet) => diet.status));
}

export function MealLifecycleStrip({ data, role, selectedMealId, liveClock = true }: { data: ManagementDay; role: Role; selectedMealId?: string; liveClock?: boolean }) {
  const [now, setNow] = useState(() => new Date(data.generatedAt));
  useEffect(() => { if (!liveClock) return; const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, [liveClock]);
  const dayDate = useMemo(() => new Date(`${data.date}T00:00:00.000Z`), [data.date]);
  const picked = useMemo(() => {
    const chosen = selectedMealId ? data.meals.find((meal) => meal.id === selectedMealId) : undefined;
    if (chosen) return { meal: chosen, nextCycle: false };
    const lifecycle = pickLifecycleMeal(data.meals.map((meal) => ({ meal, mealDate: dayDate, cutoffTime: meal.cutoffTime, serviceTime: meal.serviceTime, status: statusOf(meal) })), now, data.serviceCompletionMinutes);
    return lifecycle ? { meal: lifecycle.meal.meal, nextCycle: lifecycle.nextCycle } : undefined;
  }, [data.meals, data.serviceCompletionMinutes, dayDate, now, selectedMealId]);
  if (!picked) return null;
  const { meal: current, nextCycle } = picked;
  const state = displayMealState(dayDate, current.cutoffTime, current.serviceTime, statusOf(current), now, data.serviceCompletionMinutes);
  // Bữa đã qua (đã phục vụ hoặc quá giờ): cả ba chặng đều xong, không chặng nào đang chạy.
  const ended = !nextCycle && (state?.key === "SERVED" || state?.key === "INCOMPLETE");
  const activeIndex = ended ? steps.length : nextCycle || state?.key === "RECEIVING" || state?.key === "UPCOMING" ? 0 : state?.key === "PREPARING" || state?.key === "COOKING" ? 1 : 2;
  return <section className="nurse-progress-card shared-lifecycle" data-role={role.toLowerCase()} aria-label={`Vòng đời bữa ${current.name}`}><header><span>{nextCycle ? "Các bữa hôm nay đã kết thúc · bữa kế" : "Suất cần phục vụ hiện tại"}</span><strong>{current.name} — {nextCycle ? "Chưa tới" : state?.label ?? "—"}</strong><small>{nextCycle ? "Ngày mai · " : ""}Chốt {current.cutoffTime} · Phục vụ {current.serviceTime}</small></header><ol>{steps.map(({ label, icon: Icon }, index) => <li key={label} className={index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming"}><span><Icon aria-hidden="true"/><b>{label}</b></span></li>)}</ol></section>;
}
