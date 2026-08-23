export type NurseWorkflowMeal = { id: string; name: string; mealDate: string; cutoffTime: string; serviceTime: string };
export type NurseWorkflowPhase = "REPORTING" | "PREPARING" | "SERVING";

function at(mealDate: string, time: string) { return new Date(`${mealDate}T${time}:00+07:00`).getTime(); }

export function currentNurseWorkflow(meals: NurseWorkflowMeal[], completionMinutes: number, now = new Date()) {
  if (!meals.length) return null;
  const nowMs = now.getTime();
  const ordered = [...meals].sort((a, b) => at(a.mealDate, a.serviceTime) - at(b.mealDate, b.serviceTime));
  for (const meal of ordered) {
    const cutoff = at(meal.mealDate, meal.cutoffTime); const service = at(meal.mealDate, meal.serviceTime);
    if (nowMs < cutoff) return { meal, phase: "REPORTING" as NurseWorkflowPhase };
    if (nowMs < service) return { meal, phase: "PREPARING" as NurseWorkflowPhase };
    if (nowMs < service + completionMinutes * 60_000) return { meal, phase: "SERVING" as NurseWorkflowPhase };
  }
  return { meal: ordered[0], phase: "REPORTING" as NurseWorkflowPhase };
}

export const NURSE_PHASE_LABEL: Record<NurseWorkflowPhase, string> = { REPORTING: "Báo suất ăn", PREPARING: "Bếp đang chuẩn bị", SERVING: "Đang phục vụ" };
