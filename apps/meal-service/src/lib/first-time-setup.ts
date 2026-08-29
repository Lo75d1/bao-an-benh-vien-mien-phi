import { Prisma, type FeedingRoute, type Role } from "@prisma/client";
import { prisma } from "./prisma";
import { ensureEmptyMealEvents, startOfIsoWeek } from "./meal-events";
import { readOperationalSettings } from "./settings";
import { randomBytes } from "node:crypto";
import { hashPassword } from "./password";

export const FIRST_TIME_SETUP_KEY = "firstTimeSetup";
export const FIRST_TIME_SETUP_VERSION = 1;
const FIRST_TIME_SETUP_LOCK = "meal-service:first-time-setup";

export type SetupInventory = {
  adminValid: boolean;
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
  if (!input.adminValid) issues.push({ code: "ADMIN", message: "Cần xác nhận ít nhất một tài khoản Admin đang hoạt động." });
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

export async function readSetupInventory(adminId?: string): Promise<SetupInventory> {
  const [admin, settings, departments, nurses, kitchens, editors, diets, meals] = await Promise.all([
    adminId ? prisma.user.findUnique({ where: { id: adminId }, select: { mustChangePassword: true } }) : prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE" }, select: { mustChangePassword: true } }),
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
    adminValid: !!admin,
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

export type PreparedSetup = {
  completion: { completedAt: string; completedById: string; version: number };
  credentials: Array<{ userId: string; password: string }>;
};

export async function buildBeforeCommit<T>(build: () => Promise<T>, commit: () => Promise<void>): Promise<T> {
  const artifact = await build();
  await commit();
  return artifact;
}

export async function completeFirstTimeSetup<T>(
  actor: { id: string; displayName: string; role: Role },
  buildOneTimeArtifact: (prepared: PreparedSetup) => Promise<T>,
  now = new Date(),
) {
  if (actor.role !== "ADMIN") throw new Error("Chỉ Admin được hoàn tất thiết lập ban đầu.");
  if (await readSetupCompletion()) throw new Error("Hệ thống đã hoàn tất khởi tạo; không thể chạy bootstrap lần nữa.");
  const inventory = await readSetupInventory(actor.id);
  const issues = validateSetupInventory(inventory);
  if (issues.length) throw new Error(issues.map((item) => item.message).join(" "));
  await ensureEmptyMealEvents(startOfIsoWeek(now), actor);
  const completion = { completedAt: now.toISOString(), completedById: actor.id, version: FIRST_TIME_SETUP_VERSION };
  const auxiliaryUsers = await prisma.user.findMany({ where: { id: { not: actor.id }, status: "ACTIVE" }, select: { id: true } });
  const credentials = auxiliaryUsers.map((user) => ({ userId: user.id, password: `BV-${randomBytes(9).toString("base64url")}` }));
  // Build the only plaintext credential export before any irreversible DB write.
  // If workbook generation fails, passwords and setup completion stay untouched.
  const artifact = await buildBeforeCommit(
    () => buildOneTimeArtifact({ completion, credentials }),
    () => prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${FIRST_TIME_SETUP_LOCK}))`);
      const existing = await tx.appSetting.findUnique({ where: { key: FIRST_TIME_SETUP_KEY }, select: { valueJson: true } });
      if (parseSetupCompletion(existing?.valueJson)) throw new Error("Hệ thống đã hoàn tất khởi tạo; không thể chạy bootstrap lần nữa.");
      for (const credential of credentials) await tx.user.update({ where: { id: credential.userId }, data: { passwordHash: hashPassword(credential.password), mustChangePassword: true } });
      await tx.appSetting.create({ data: { key: FIRST_TIME_SETUP_KEY, valueJson: completion } });
      await tx.auditLog.create({ data: { entityType: "AppSetting", entityId: FIRST_TIME_SETUP_KEY, action: "COMPLETE_SETUP", actorId: actor.id, actorName: actor.displayName, afterJson: completion, reason: "Admin xác nhận hoàn tất thiết lập ban đầu" } });
    }),
  );
  return { completion, artifact };
}
