import type { Role } from "@prisma/client";
import { readManagementDay } from "@/lib/management";
import { MealLifecycleStrip } from "./meal-lifecycle-strip";

export async function CurrentMealLifecycle({ role }: { role: Role }) {
  let data;
  try {
    data = await readManagementDay();
  } catch {
    return null;
  }
  return <MealLifecycleStrip data={data} role={role}/>;
}
