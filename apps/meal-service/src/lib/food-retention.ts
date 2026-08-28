export type FoodRetentionState =
  | { status: "RETAINING"; remainingMinutes: number }
  | { status: "COMPLETED"; remainingMinutes: 0 };

const RETENTION_MINUTES = 24 * 60;

export function foodRetentionState(uploadedAt: Date, now: Date): FoodRetentionState {
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - uploadedAt.getTime()) / 60000));
  const remainingMinutes = Math.max(0, RETENTION_MINUTES - elapsedMinutes);
  return remainingMinutes > 0 ? { status: "RETAINING", remainingMinutes } : { status: "COMPLETED", remainingMinutes: 0 };
}

export function foodRetentionLabel(uploadedAt: Date, now: Date): string {
  const state = foodRetentionState(uploadedAt, now);
  if (state.status === "COMPLETED") return "Đã đủ 24 giờ";
  const hours = Math.floor(state.remainingMinutes / 60);
  const minutes = state.remainingMinutes % 60;
  return `Đang lưu mẫu · còn ${hours} giờ${minutes ? ` ${minutes} phút` : ""}`;
}
