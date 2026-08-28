import type { DemoWorkspace } from "./demo-session";

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
    },
    {
      title: "Gửi báo suất",
      instruction:
        "Bấm xác nhận, điền tên người báo và lưu gửi cho Bếp. Bước chỉ hoàn thành khi hệ thống báo thành công.",
      href: "/bao-suat",
      target: ".nurse-serving-footer",
      expectation: { type: "action", actionId: "serving-report" },
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
    },
    {
      title: "Chọn mã chế độ ăn",
      instruction:
        "Bấm một mã chế độ ăn để xem khuyến nghị và chọn đúng vùng soạn món.",
      href: "/thuc-don",
      target: ".nutrition-code-actions",
      expectation: { type: "click", selector: ".nutrition-code-actions" },
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
    },
    {
      title: "Mở bằng chứng ảnh",
      instruction: "Mở Ảnh món & xác nhận sẵn sàng.",
      href: "/bep",
      target: ".kitchen-complete",
      expectation: { type: "click", selector: ".kitchen-complete" },
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
    },
    {
      title: "Xác nhận sẵn sàng",
      instruction:
        "Lưu ảnh và xác nhận. Bước chỉ hoàn thành khi ActionResult thành công.",
      href: "/bep",
      target: ".kitchen-finish-actions",
      expectation: { type: "action", actionId: "kitchen-ready" },
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
    },
    {
      title: "Đối chiếu theo mã",
      instruction:
        "Chuyển sang Theo mã chế độ ăn để đối chiếu số suất và bằng chứng Bếp.",
      href: "/quan-ly",
      target: ".admin-view-switch",
      expectation: { type: "click", selector: ".admin-view-switch button" },
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
    },
    {
      title: "Mở bằng chứng Sonde",
      instruction: "Mở công cụ ảnh của đúng cữ Sonde.",
      href: "/bep",
      target: ".kitchen-complete",
      expectation: { type: "click", selector: ".kitchen-complete" },
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
    },
    {
      title: "Xác nhận cữ sẵn sàng",
      instruction: "Lưu ảnh và xác nhận. Dữ liệu chỉ thuộc luồng Sonde.",
      href: "/bep",
      target: ".kitchen-finish-actions",
      expectation: { type: "action", actionId: "kitchen-ready" },
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
