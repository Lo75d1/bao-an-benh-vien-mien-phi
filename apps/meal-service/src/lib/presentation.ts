const shortDate = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

export function formatVnDay(value: Date) {
  return shortDate.format(value).replace("Th ", "T").replace("CN", "CN");
}

export function dietDisplayName(name: string, code?: string | null) {
  return { name, code: code || null };
}

export const mealStatusLabel = {
  PLANNED: "Dự kiến",
  LOCKED: "Đã chốt",
  PREPARING: "Đang chuẩn bị",
  PREPARED: "Đã chuẩn bị",
  SERVED: "Đã phục vụ",
  CANCELLED: "Đã hủy",
} as const;

export const acknowledgementLabel = {
  PENDING: "Chờ bếp xác nhận",
  RECEIVED: "Đã nhận",
  INSUFFICIENT: "Không đủ",
  SUBSTITUTION_NEEDED: "Cần thay thế",
} as const;
