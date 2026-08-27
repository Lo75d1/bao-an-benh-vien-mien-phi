const RETENTION_MINUTES = 24 * 60;

export type FoodRetentionState =
  | { status: "RETAINING"; remainingMinutes: number }
  | { status: "COMPLETED"; remainingMinutes: 0 };

export function foodRetentionState(uploadedAt: Date, now = new Date()): FoodRetentionState {
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - uploadedAt.getTime()) / 60_000));
  const remainingMinutes = Math.max(0, RETENTION_MINUTES - elapsedMinutes);
  return remainingMinutes === 0
    ? { status: "COMPLETED", remainingMinutes: 0 }
    : { status: "RETAINING", remainingMinutes };
}

export function foodRetentionLabel(uploadedAt: Date, now = new Date()): string {
  const state = foodRetentionState(uploadedAt, now);
  if (state.status === "COMPLETED") return "Đã đủ 24 giờ";
  const hours = Math.floor(state.remainingMinutes / 60);
  const minutes = state.remainingMinutes % 60;
  return `Đang lưu mẫu · còn ${hours ? `${hours} giờ` : ""}${hours && minutes ? " " : ""}${minutes ? `${minutes} phút` : ""}`;
}
