import type { DemoWorkspace } from "./demo-session";
import type { DemoTourStage } from "./demo-tour-clock";

export type DemoTourStatus = "NOT_STARTED" | "ACTIVE" | "DONE";
export type DemoTourWorkspaceProgress = {
  status: DemoTourStatus;
  step: number;
};
export type DemoTourProgress = Partial<
  Record<DemoWorkspace, DemoTourWorkspaceProgress>
>;
export type DemoTourExpectation =
  | { type: "click" | "input" | "change"; selector: string }
  | { type: "action"; actionId: string };
export type DemoTourStep = {
  title: string;
  instruction: string;
  href: string;
  target: string;
  expectation: DemoTourExpectation;
  timeline: {
    stage: DemoTourStage;
    milestone: string;
  };
};

export const DEMO_TOUR_STEPS: Record<DemoWorkspace, DemoTourStep[]> = {
  NURSE: [
    {
      title: "Nhập số suất",
      instruction: "Nhập số suất lớn hơn 0 cho một mã chế độ ăn.",
      href: "/bao-suat",
      target: "[data-demo-control=nurse-quantity]",
      expectation: {
        type: "input",
        selector: "[data-demo-control=nurse-quantity]",
      },
      timeline: { stage: "REPORTING", milestone: "Trước giờ chốt suất" },
    },
    {
      title: "Gửi báo suất",
      instruction:
        "Bấm xác nhận, điền tên người báo và lưu gửi cho Bếp. Bước chỉ hoàn thành khi hệ thống báo thành công.",
      href: "/bao-suat",
      target: ".nurse-serving-footer",
      expectation: { type: "action", actionId: "serving-report" },
      timeline: { stage: "REPORTING", milestone: "Khoa gửi số suất cho Bếp" },
    },
    {
      title: "Mở xác nhận giao nhận",
      instruction:
        "Đến giờ phục vụ, mở xác nhận giao nhận để kiểm đếm số suất Bếp bàn giao.",
      href: "/bao-suat",
      target: "[data-demo-guide=delivery-receipt]",
      expectation: {
        type: "click",
        selector: "[data-demo-guide=delivery-receipt]",
      },
      timeline: { stage: "SERVICE", milestone: "Bếp giao suất cho khoa" },
    },
    {
      title: "Xác nhận đã nhận đủ",
      instruction:
        "Chọn Đã nhận đủ. Bước chỉ hoàn thành khi hệ thống lưu xác nhận giao nhận thành công.",
      href: "/bao-suat",
      target: ".delivery-receipt-actions",
      expectation: { type: "action", actionId: "delivery-receipt" },
      timeline: { stage: "SERVICE", milestone: "Khoa xác nhận kết quả giao nhận" },
    },
  ],
  DIETITIAN: [
    {
      title: "Chọn đúng bữa",
      instruction: "Chọn một bữa đang cần lên thực đơn trong lịch bữa ăn.",
      href: "/thuc-don",
      target: "[data-demo-guide=nutrition-picker]",
      expectation: {
        type: "click",
        selector:
          "[data-demo-guide=nutrition-picker] a, [data-demo-guide=nutrition-picker] button",
      },
      timeline: { stage: "PLANNING", milestone: "Lên thực đơn trước giờ khóa" },
    },
    {
      title: "Mở nhập Excel",
      instruction:
        "Mở công cụ Nhập Excel để xem luồng ghép cột và kiểm tra dữ liệu.",
      href: "/thuc-don",
      target: "[data-demo-guide=excel-import]",
      expectation: {
        type: "click",
        selector: "[data-demo-guide=excel-import]",
      },
      timeline: { stage: "PLANNING", milestone: "Nhập dữ liệu thực đơn" },
    },
    {
      title: "Chọn mã chế độ ăn",
      instruction:
        "Bấm một mã chế độ ăn để xem khuyến nghị và chọn đúng vùng soạn món.",
      href: "/thuc-don",
      target: ".nutrition-code-actions",
      expectation: { type: "click", selector: ".nutrition-code-actions" },
      timeline: { stage: "PLANNING", milestone: "Đối chiếu khuyến nghị theo mã" },
    },
    {
      title: "Mở phần phân tích",
      instruction:
        "Chuyển sang phân tích để xem ma trận nguyên liệu và mức đáp ứng khuyến nghị.",
      href: "/thuc-don",
      target: "[data-demo-control=nutrition-analysis]",
      expectation: {
        type: "click",
        selector: "[data-demo-control=nutrition-analysis]",
      },
      timeline: { stage: "PLANNING", milestone: "Kiểm tra trước khi tự khóa" },
    },
  ],
  KITCHEN_NORMAL: [
    {
      title: "Kiểm tra số suất",
      instruction:
        "Bấm một mã để xem số suất Điều dưỡng vừa báo và nguyên liệu cần dùng.",
      href: "/bep",
      target: ".kitchen-operation-main tbody tr",
      expectation: {
        type: "click",
        selector: ".kitchen-operation-main tbody tr",
      },
      timeline: { stage: "PREPARATION", milestone: "Bếp tiếp nhận số suất đã chốt" },
    },
    {
      title: "Mở bằng chứng ảnh",
      instruction: "Mở Ảnh món & xác nhận sẵn sàng.",
      href: "/bep",
      target: ".kitchen-complete",
      expectation: { type: "click", selector: ".kitchen-complete" },
      timeline: { stage: "PREPARATION", milestone: "Chuẩn bị bằng chứng món" },
    },
    {
      title: "Chọn hoặc chụp ảnh",
      instruction: "Chụp ảnh hoặc chọn ảnh cho ít nhất một mã chế độ ăn.",
      href: "/bep",
      target: ".kitchen-finish-dialog .kitchen-image-actions",
      expectation: {
        type: "change",
        selector: ".kitchen-finish-dialog input[type=file]",
      },
      timeline: { stage: "PREPARATION", milestone: "Chụp hoặc chọn ảnh thực tế" },
    },
    {
      title: "Xác nhận sẵn sàng",
      instruction:
        "Lưu ảnh và xác nhận. Bước chỉ hoàn thành khi ActionResult thành công.",
      href: "/bep",
      target: ".kitchen-finish-actions",
      expectation: { type: "action", actionId: "kitchen-ready" },
      timeline: { stage: "PREPARATION", milestone: "Bếp xác nhận sẵn sàng giao" },
    },
  ],
  ADMIN: [
    {
      title: "Kiểm tra dữ liệu xuyên vai trò",
      instruction:
        "Bấm một khoa để xem người báo, số suất và trạng thái giao nhận.",
      href: "/quan-ly",
      target: ".admin-serving-master tbody tr",
      expectation: {
        type: "click",
        selector: ".admin-serving-master tbody tr",
      },
      timeline: { stage: "SERVICE", milestone: "Theo dõi giao nhận theo khoa" },
    },
    {
      title: "Đối chiếu theo mã",
      instruction:
        "Chuyển sang Theo mã chế độ ăn để đối chiếu số suất và bằng chứng Bếp.",
      href: "/quan-ly",
      target: ".admin-view-switch",
      expectation: { type: "click", selector: ".admin-view-switch button" },
      timeline: { stage: "CLOSED", milestone: "Đối chiếu fact còn thiếu sau phục vụ" },
    },
  ],
  KITCHEN_SONDE: [
    {
      title: "Kiểm tra đúng cữ Sonde",
      instruction: "Bấm một mã Sonde để xem công thức và số suất của cữ này.",
      href: "/bep",
      target: ".kitchen-operation-main tbody tr",
      expectation: {
        type: "click",
        selector: ".kitchen-operation-main tbody tr",
      },
      timeline: { stage: "PREPARATION", milestone: "Bếp Sonde tiếp nhận đúng cữ" },
    },
    {
      title: "Mở bằng chứng Sonde",
      instruction: "Mở công cụ ảnh của đúng cữ Sonde.",
      href: "/bep",
      target: ".kitchen-complete",
      expectation: { type: "click", selector: ".kitchen-complete" },
      timeline: { stage: "PREPARATION", milestone: "Chuẩn bị bằng chứng đúng cữ" },
    },
    {
      title: "Chụp hoặc chọn ảnh Sonde",
      instruction: "Chụp hoặc chọn ảnh cho ít nhất một mã Sonde.",
      href: "/bep",
      target: ".kitchen-finish-dialog .kitchen-image-actions",
      expectation: {
        type: "change",
        selector: ".kitchen-finish-dialog input[type=file]",
      },
      timeline: { stage: "PREPARATION", milestone: "Chụp hoặc chọn ảnh cữ Sonde" },
    },
    {
      title: "Xác nhận cữ sẵn sàng",
      instruction: "Lưu ảnh và xác nhận. Dữ liệu chỉ thuộc luồng Sonde.",
      href: "/bep",
      target: ".kitchen-finish-actions",
      expectation: { type: "action", actionId: "kitchen-ready" },
      timeline: { stage: "PREPARATION", milestone: "Xác nhận cữ Sonde sẵn sàng" },
    },
  ],
};

export function normalizeTourProgress(value: unknown): DemoTourProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: DemoTourProgress = {};
  for (const workspace of Object.keys(DEMO_TOUR_STEPS) as DemoWorkspace[]) {
    const item = (value as Record<string, unknown>)[workspace];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const status = (item as { status?: unknown }).status;
    const step = (item as { step?: unknown }).step;
    if (
      (status === "NOT_STARTED" || status === "ACTIVE" || status === "DONE") &&
      Number.isInteger(step) &&
      Number(step) >= 0
    )
      result[workspace] = { status, step: Number(step) };
  }
  return result;
}

export function canTransitionTour(
  current: DemoTourWorkspaceProgress,
  next: DemoTourWorkspaceProgress,
  totalSteps: number,
) {
  const lastStep = totalSteps - 1;
  return (
    (current.status === "NOT_STARTED" &&
      next.status === "ACTIVE" &&
      next.step === 0) ||
    (current.status === next.status && current.step === next.step) ||
    (current.status === "ACTIVE" &&
      next.status === "ACTIVE" &&
      next.step === current.step + 1) ||
    (current.status === "ACTIVE" &&
      current.step === lastStep &&
      next.status === "DONE" &&
      next.step === totalSteps)
  );
}
