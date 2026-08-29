type ErrorLike = { name?: unknown; code?: unknown };

export type PublicDemoError = { status: number; message: string };

export function publicDemoError(error: unknown): PublicDemoError {
  const value = error && typeof error === "object" ? (error as ErrorLike) : {};
  const name = typeof value.name === "string" ? value.name : "";
  const code = typeof value.code === "string" ? value.code : "";
  if (name.startsWith("Prisma") || code === "P1001" || code === "P2021") {
    return {
      status: 503,
      message: "Phiên Demo đang tạm gián đoạn. Vui lòng thử lại sau hoặc liên hệ quản trị hệ thống.",
    };
  }
  return {
    status: 400,
    message: error instanceof Error ? error.message : "Không thể cập nhật Demo Session.",
  };
}
