import type { Role } from "@prisma/client";
import { readManagementDay } from "@/lib/management";
import { MealLifecycleStrip } from "./meal-lifecycle-strip";

export async function CurrentMealLifecycle({ role, selectedMealId, now, liveClock = true }: { role: Role; selectedMealId?: string; now?: Date; liveClock?: boolean }) {
  let data;
  try {
    data = await readManagementDay(undefined, now);
  } catch {
    return null;
  }
  return <MealLifecycleStrip data={data} role={role} selectedMealId={selectedMealId} liveClock={liveClock}/>;
}
