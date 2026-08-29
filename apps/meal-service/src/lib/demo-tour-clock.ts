import type { FeedingRoute } from "@prisma/client";
import { mealTimeMilestones } from "./meal-events";
import type { DemoWorkspace } from "./demo-session";

export const DEMO_TOUR_STAGES = [
  "PLANNING",
  "REPORTING",
  "PREPARATION",
  "SERVICE",
  "CLOSED",
] as const;

export type DemoTourStage = (typeof DEMO_TOUR_STAGES)[number];

export function isDemoTourStage(value: unknown): value is DemoTourStage {
  return (
    typeof value === "string" &&
    (DEMO_TOUR_STAGES as readonly string[]).includes(value)
  );
}

export function demoTourRoute(workspace: DemoWorkspace): FeedingRoute {
  return workspace === "KITCHEN_SONDE" ? "SONDE" : "NORMAL";
}

export type DemoTourMealContext = {
  route: FeedingRoute;
  mealEventId: string;
  dietMealId: string | null;
  mealDate: string;
  serviceTime: string;
};

export function applyDemoTourMealContext(url: URL, workspace: DemoWorkspace, clock: DemoTourMealContext) {
  url.searchParams.set("route", clock.route);
  if (workspace === "DIETITIAN" && clock.dietMealId) url.searchParams.set("meal", clock.dietMealId);
  else if (workspace === "ADMIN") {
    url.searchParams.set("date", clock.mealDate);
    url.searchParams.set("meal", clock.serviceTime);
  } else url.searchParams.set("meal", clock.mealEventId);
}

export function demoTourStageInstant(
  mealDate: Date,
  cutoffTime: string,
  serviceTime: string,
  stage: DemoTourStage,
  completionMinutes: number,
) {
  const milestones = mealTimeMilestones(
    mealDate,
    cutoffTime,
    serviceTime,
    completionMinutes,
  );
  if (!milestones) return null;
  const minute = 60_000;
  const preparationWindow = Math.max(
    minute,
    milestones.serviceAt.getTime() - milestones.cutoffAt.getTime(),
  );
  const serviceWindow = Math.max(
    minute,
    milestones.completionAt.getTime() - milestones.serviceAt.getTime(),
  );
  const target =
    stage === "PLANNING"
      ? milestones.cutoffAt.getTime() - 120 * minute
      : stage === "REPORTING"
        ? milestones.cutoffAt.getTime() - 20 * minute
        : stage === "PREPARATION"
          ? milestones.cutoffAt.getTime() + Math.min(5 * minute, preparationWindow / 2)
          : stage === "SERVICE"
            ? milestones.serviceAt.getTime() + Math.min(5 * minute, serviceWindow / 2)
            : milestones.completionAt.getTime() + 5 * minute;
  return new Date(target);
}

export const DEMO_TOUR_STAGE_COPY: Record<
  DemoTourStage,
  { label: string; responsibility: string }
> = {
  PLANNING: {
    label: "Lên thực đơn trước giờ khóa",
    responsibility: "Dinh dưỡng chuẩn bị và kiểm tra thực đơn để Bếp chủ động.",
  },
  REPORTING: {
    label: "Khoa đang báo suất",
    responsibility: "Điều dưỡng nhập và gửi số suất trước giờ chốt.",
  },
  PREPARATION: {
    label: "Bếp đang chuẩn bị",
    responsibility: "Bếp tiếp nhận số suất, chế biến và lưu bằng chứng thực tế.",
  },
  SERVICE: {
    label: "Đang phục vụ",
    responsibility: "Khoa kiểm đếm và xác nhận đã nhận đủ hoặc nhận thiếu.",
  },
  CLOSED: {
    label: "Đã qua cửa sổ phục vụ",
    responsibility: "Admin đối chiếu fact còn thiếu; thời gian không tự giả hoàn tất.",
  },
};
