import type { DietMealStatus } from "@prisma/client";
import { getMealPhase } from "./meal-events";

export { getMealPhase, type MealPhase } from "./meal-events";
export type KitchenFact = "NOT_STARTED" | "IN_PROGRESS" | "PREPARED";
export type ReportFact = "NOT_SENT" | "PARTIAL" | "SENT";
export type DeliveryFact = "UNCONFIRMED" | "FULL" | "SHORT";
export type EvidenceFact = "MISSING" | "PRESENT";
export type RetentionFact = "NOT_REQUIRED" | "REQUIRED" | "PRESENT";

export type MealBusinessFacts = {
  report: ReportFact;
  kitchen: KitchenFact;
  delivery: DeliveryFact;
  mealPhoto: EvidenceFact;
  retention24h: RetentionFact;
};

/** MealEvent/DietMeal rỗng chỉ là khung lịch, chưa phải dữ liệu nghiệp vụ. */
export function hasMealBusinessData(input: {
  reportCount?: number;
  additionCount?: number;
  receiptCount?: number;
  inventoryEntryCount?: number;
  plannedServings?: number | null;
  dietStatuses?: readonly DietMealStatus[];
  menuItemCount?: number;
  evidenceCount?: number;
}): boolean {
  return (input.reportCount ?? 0) > 0
    || (input.additionCount ?? 0) > 0
    || (input.receiptCount ?? 0) > 0
    || (input.inventoryEntryCount ?? 0) > 0
    || (input.plannedServings ?? 0) > 0
    || (input.menuItemCount ?? 0) > 0
    || (input.evidenceCount ?? 0) > 0
    || (input.dietStatuses ?? []).some((status) => !["PLANNED", "CANCELLED"].includes(status));
}

export function getMealBusinessFacts(input: {
  dietStatuses?: readonly DietMealStatus[];
  reportedDepartmentCount?: number;
  totalDepartmentCount?: number;
  deliveryReceipts?: ReadonlyArray<{ status: "FULL" | "SHORT" }>;
  mealPhotoCount?: number;
  retention24hRequired?: boolean;
  retention24hCount?: number;
}): MealBusinessFacts {
  const statuses = (input.dietStatuses ?? []).filter((status) => status !== "CANCELLED");
  const kitchen: KitchenFact = statuses.length > 0 && statuses.every((status) => status === "PREPARED" || status === "SERVED")
    ? "PREPARED"
    : statuses.some((status) => status === "PREPARING" || status === "PREPARED" || status === "SERVED")
      ? "IN_PROGRESS"
      : "NOT_STARTED";

  const reported = input.reportedDepartmentCount ?? 0;
  const departments = input.totalDepartmentCount ?? 0;
  const report: ReportFact = reported === 0 ? "NOT_SENT" : departments > 0 && reported < departments ? "PARTIAL" : "SENT";

  const receipts = input.deliveryReceipts ?? [];
  const delivery: DeliveryFact = receipts.some((receipt) => receipt.status === "SHORT")
    ? "SHORT"
    : departments > 0 && receipts.length >= departments
      ? "FULL"
      : "UNCONFIRMED";

  return {
    report,
    kitchen,
    delivery,
    mealPhoto: (input.mealPhotoCount ?? 0) > 0 ? "PRESENT" : "MISSING",
    retention24h: !input.retention24hRequired
      ? "NOT_REQUIRED"
      : (input.retention24hCount ?? 0) > 0
        ? "PRESENT"
        : "REQUIRED",
  };
}

export function getMealState(
  timing: Parameters<typeof getMealPhase>,
  facts: Parameters<typeof getMealBusinessFacts>[0],
) {
  return { phase: getMealPhase(...timing), businessFacts: getMealBusinessFacts(facts) };
}
