import type { FeedingRoute, Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { ensureEmptyMealEvents, startOfIsoWeek } from "./meal-events";
import { readOperationalSettings } from "./settings";

export const FIRST_TIME_SETUP_KEY = "firstTimeSetup";
export const FIRST_TIME_SETUP_VERSION = 1;

export type SetupInventory = {
  adminPasswordChanged: boolean;
  activeDepartments: number;
  activeNursesWithDepartment: number;
  activeKitchenByRoute: Record<FeedingRoute, number>;
  menuEditors: number;
  activeDietTypesByRoute: Record<FeedingRoute, number>;
  activeMealTypesByRoute: Record<FeedingRoute, number>;
  invalidMealTimes: string[];
  sondeEnabled: boolean;
};

export type SetupIssue = { code: string; message: string };

export function validateSetupInventory(input: SetupInventory): SetupIssue[] {
  const issues: SetupIssue[] = [];
  if (!input.adminPasswordChanged) issues.push({ code: "ADMIN_PASSWORD", message: "Admin chính chưa hoàn tất đổi mật khẩu ban đầu." });
  if (input.activeDepartments < 1) issues.push({ code: "DEPARTMENT", message: "Cần ít nhất 1 khoa/phòng đang hoạt động." });
  if (input.activeNursesWithDepartment < 1) issues.push({ code: "NURSE", message: "Cần ít nhất 1 Điều dưỡng đang hoạt động và được gắn khoa." });
  if (input.activeKitchenByRoute.NORMAL < 1) issues.push({ code: "KITCHEN_NORMAL", message: "Cần ít nhất 1 tài khoản Bếp ăn thường." });
  if (input.menuEditors < 1) issues.push({ code: "MENU_EDITOR", message: "Cần ít nhất 1 Admin hoặc Dinh dưỡng viên có thể quản lý thực đơn." });
  if (input.activeDietTypesByRoute.NORMAL < 1) issues.push({ code: "DIET_NORMAL", message: "Ăn thường cần ít nhất 1 mã chế độ ăn đang dùng." });
  if (input.activeMealTypesByRoute.NORMAL < 1) issues.push({ code: "MEAL_NORMAL", message: "Ăn thường cần ít nhất 1 bữa đang dùng." });
  if (input.sondeEnabled) {
    if (input.activeKitchenByRoute.SONDE < 1) issues.push({ code: "KITCHEN_SONDE", message: "Đã bật Sonde nên cần ít nhất 1 tài khoản Bếp Sonde." });
    if (input.activeDietTypesByRoute.SONDE < 1) issues.push({ code: "DIET_SONDE", message: "Đã bật Sonde nên cần ít nhất 1 mã chế độ Sonde đang dùng." });
    if (input.activeMealTypesByRoute.SONDE < 1) issues.push({ code: "MEAL_SONDE", message: "Đã bật Sonde nên cần ít nhất 1 cữ Sonde đang dùng." });
  }
  if (input.invalidMealTimes.length) issues.push({ code: "MEAL_TIME", message: `Giờ chốt phải trước giờ phục vụ: ${input.invalidMealTimes.join(", ")}.` });
  return issues;
}

export function parseSetupCompletion(value: unknown): { completedAt: string; completedById: string; version: number } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (item.version !== FIRST_TIME_SETUP_VERSION || typeof item.completedAt !== "string" || Number.isNaN(Date.parse(item.completedAt)) || typeof item.completedById !== "string" || !item.completedById) return null;
  return { completedAt: item.completedAt, completedById: item.completedById, version: item.version };
}

export async function readSetupCompletion() {
  const row = await prisma.appSetting.findUnique({ where: { key: FIRST_TIME_SETUP_KEY }, select: { valueJson: true } });
  return parseSetupCompletion(row?.valueJson);
}

export async function readSetupInventory(adminId: string): Promise<SetupInventory> {
  const [admin, settings, departments, nurses, kitchens, editors, diets, meals] = await Promise.all([
    prisma.user.findUnique({ where: { id: adminId }, select: { mustChangePassword: true } }),
    readOperationalSettings(),
    prisma.department.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "NURSE", status: "ACTIVE", memberships: { some: { department: { status: "ACTIVE" } } } } }),
    prisma.user.groupBy({ by: ["kitchenRoute"], where: { role: "KITCHEN", status: "ACTIVE", kitchenRoute: { not: null } }, _count: { _all: true } }),
    prisma.user.count({ where: { role: { in: ["ADMIN", "DIETITIAN"] }, status: "ACTIVE" } }),
    prisma.dietType.groupBy({ by: ["feedingRoute"], where: { status: "ACTIVE" }, _count: { _all: true } }),
    prisma.mealType.findMany({ where: { status: "ACTIVE" }, select: { name: true, feedingRoute: true, cutoffTime: true, serviceTime: true } }),
  ]);
  const routeCount = <T extends { feedingRoute?: FeedingRoute | null; kitchenRoute?: FeedingRoute | null; _count: { _all: number } }>(rows: T[], key: "feedingRoute" | "kitchenRoute", route: FeedingRoute) => rows.find((row) => row[key] === route)?._count._all ?? 0;
  return {
    adminPasswordChanged: !!admin && !admin.mustChangePassword,
    activeDepartments: departments,
    activeNursesWithDepartment: nurses,
    activeKitchenByRoute: { NORMAL: routeCount(kitchens, "kitchenRoute", "NORMAL"), SONDE: routeCount(kitchens, "kitchenRoute", "SONDE") },
    menuEditors: editors,
    activeDietTypesByRoute: { NORMAL: routeCount(diets, "feedingRoute", "NORMAL"), SONDE: routeCount(diets, "feedingRoute", "SONDE") },
    activeMealTypesByRoute: { NORMAL: meals.filter((item) => item.feedingRoute === "NORMAL").length, SONDE: meals.filter((item) => item.feedingRoute === "SONDE").length },
    invalidMealTimes: meals.filter((item) => item.cutoffTime >= item.serviceTime).map((item) => item.name),
    sondeEnabled: settings.sondeEnabled,
  };
}

export async function completeFirstTimeSetup(actor: { id: string; displayName: string; role: Role }, now = new Date()) {
  if (actor.role !== "ADMIN") throw new Error("Chỉ Admin được hoàn tất thiết lập ban đầu.");
  const inventory = await readSetupInventory(actor.id);
  const issues = validateSetupInventory(inventory);
  if (issues.length) throw new Error(issues.map((item) => item.message).join(" "));
  await ensureEmptyMealEvents(startOfIsoWeek(now), actor);
  const completion = { completedAt: now.toISOString(), completedById: actor.id, version: FIRST_TIME_SETUP_VERSION };
  await prisma.$transaction(async (tx) => {
    const existing = await tx.appSetting.findUnique({ where: { key: FIRST_TIME_SETUP_KEY }, select: { valueJson: true } });
    await tx.appSetting.upsert({ where: { key: FIRST_TIME_SETUP_KEY }, create: { key: FIRST_TIME_SETUP_KEY, valueJson: completion }, update: { valueJson: completion } });
    await tx.auditLog.create({ data: { entityType: "AppSetting", entityId: FIRST_TIME_SETUP_KEY, action: existing ? "RECONFIRM_SETUP" : "COMPLETE_SETUP", actorId: actor.id, actorName: actor.displayName, beforeJson: existing?.valueJson as Prisma.InputJsonValue | undefined, afterJson: completion, reason: "Admin xác nhận hoàn tất thiết lập ban đầu" } });
  });
  return completion;
}
