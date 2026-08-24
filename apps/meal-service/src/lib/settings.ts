import type { Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";

export const SETTINGS_KEY = "operations";
export const WAREHOUSE_MODE_KEY = "warehouseMode";
export const DEFAULT_SETTINGS: OperationalSettings = {
  dataStartDate: "",
  advanceEntryDays: 7,
  sondeEnabled: true,
  warehouseMode: "A",
  warehouseApprovalRole: "ADMIN",
  serviceCompletionMinutes: 60,
  publicMenuImages: true,
  publicViewCountVisible: true,
};

export type OperationalSettings = {
  dataStartDate: string;
  advanceEntryDays: number;
  sondeEnabled: boolean;
  warehouseMode: "A" | "B";
  warehouseApprovalRole: Role;
  serviceCompletionMinutes: number;
  publicMenuImages: boolean;
  publicViewCountVisible: boolean;
};

export type MealTimeInput = { id: string; cutoffTime: string; serviceTime: string };
export type SettingsActor = { id: string; displayName: string; role: Role };

const APPROVAL_ROLES = new Set<Role>(["ADMIN", "DIETITIAN", "KITCHEN"]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseOperationalSettings(value: unknown): OperationalSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_SETTINGS };
  const source = value as Record<string, unknown>;
  return {
    dataStartDate: typeof source.dataStartDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.dataStartDate) ? source.dataStartDate : DEFAULT_SETTINGS.dataStartDate,
    advanceEntryDays: Number.isInteger(source.advanceEntryDays) && Number(source.advanceEntryDays) >= 1 && Number(source.advanceEntryDays) <= 60 ? Number(source.advanceEntryDays) : DEFAULT_SETTINGS.advanceEntryDays,
    sondeEnabled: typeof source.sondeEnabled === "boolean" ? source.sondeEnabled : DEFAULT_SETTINGS.sondeEnabled,
    warehouseMode: source.warehouseMode === "B" ? "B" : "A",
    warehouseApprovalRole: typeof source.warehouseApprovalRole === "string" && APPROVAL_ROLES.has(source.warehouseApprovalRole as Role) ? source.warehouseApprovalRole as Role : DEFAULT_SETTINGS.warehouseApprovalRole,
    serviceCompletionMinutes: Number.isInteger(source.serviceCompletionMinutes) && Number(source.serviceCompletionMinutes) >= 15 && Number(source.serviceCompletionMinutes) <= 240 ? Number(source.serviceCompletionMinutes) : DEFAULT_SETTINGS.serviceCompletionMinutes,
    publicMenuImages: typeof source.publicMenuImages === "boolean" ? source.publicMenuImages : DEFAULT_SETTINGS.publicMenuImages,
    publicViewCountVisible: typeof source.publicViewCountVisible === "boolean" ? source.publicViewCountVisible : DEFAULT_SETTINGS.publicViewCountVisible,
  };
}

export function validateOperationalSettings(input: OperationalSettings): OperationalSettings {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dataStartDate) || Number.isNaN(new Date(`${input.dataStartDate}T00:00:00.000Z`).getTime())) throw new Error("Ngày bắt đầu dữ liệu không hợp lệ.");
  if (!Number.isInteger(input.advanceEntryDays) || input.advanceEntryDays < 1 || input.advanceEntryDays > 60) throw new Error("Số ngày nhập trước phải từ 1 đến 60.");
  if (!APPROVAL_ROLES.has(input.warehouseApprovalRole)) throw new Error("Role duyệt kho không hợp lệ.");
  if (!Number.isInteger(input.serviceCompletionMinutes) || input.serviceCompletionMinutes < 15 || input.serviceCompletionMinutes > 240) throw new Error("Thời gian kết thúc phục vụ phải từ 15 đến 240 phút.");
  return { ...input };
}

export function validateMealTimes(items: MealTimeInput[]): MealTimeInput[] {
  if (!items.length) throw new Error("Chưa có bữa ăn để cấu hình giờ.");
  return items.map((item) => {
    if (!item.id || !TIME_PATTERN.test(item.cutoffTime) || !TIME_PATTERN.test(item.serviceTime)) throw new Error("Giờ chốt và giờ ăn phải có dạng HH:mm.");
    return { ...item };
  });
}

export function routeVisible(route: "NORMAL" | "SONDE", sondeEnabled: boolean): boolean {
  return route === "NORMAL" || sondeEnabled;
}

export function entryWindowEnd(now: Date, advanceEntryDays: number): Date {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + advanceEntryDays);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export function canApproveWarehouse(role: Role, configuredRole: Role): boolean {
  return role === "ADMIN" || role === configuredRole;
}

export async function readOperationalSettings(client: Prisma.TransactionClient | typeof prisma = prisma): Promise<OperationalSettings> {
  const row = await client.appSetting.findUnique({ where: { key: SETTINGS_KEY }, select: { valueJson: true } });
  if (row) {
    const parsed = parseOperationalSettings(row.valueJson);
    if (parsed.dataStartDate) return parsed;
    const first = await client.mealEvent.findFirst({ orderBy: { mealDate: "asc" }, select: { mealDate: true } });
    return { ...parsed, dataStartDate: first?.mealDate.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10) };
  }
  const legacy = await client.appSetting.findUnique({ where: { key: WAREHOUSE_MODE_KEY }, select: { valueJson: true } });
  const first = await client.mealEvent.findFirst({ orderBy: { mealDate: "asc" }, select: { mealDate: true } });
  return { ...DEFAULT_SETTINGS, dataStartDate: first?.mealDate.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10), warehouseMode: legacy?.valueJson === "B" || (legacy?.valueJson && typeof legacy.valueJson === "object" && "mode" in legacy.valueJson && legacy.valueJson.mode === "B") ? "B" : "A" };
}

export function clampDateToDataStart(value: string, dataStartDate: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= dataStartDate ? value : dataStartDate;
}

export async function updateOperationalSettings(input: OperationalSettings, mealTimes: MealTimeInput[], actor: SettingsActor, reason: string) {
  if (actor.role !== "ADMIN") throw new Error("Chỉ quản trị viên được đổi cấu hình hệ thống.");
  const settings = validateOperationalSettings(input);
  const times = validateMealTimes(mealTimes);
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 500) throw new Error("Lý do thay đổi phải có từ 3 đến 500 ký tự.");
  return prisma.$transaction(async (tx) => {
    const [beforeSetting, beforeMeals] = await Promise.all([
      readOperationalSettings(tx),
      tx.mealType.findMany({ where: { id: { in: times.map((item) => item.id) } }, select: { id: true, cutoffTime: true, serviceTime: true } }),
    ]);
    if (beforeMeals.length !== times.length) throw new Error("Có bữa ăn không tồn tại.");
    await tx.appSetting.upsert({ where: { key: SETTINGS_KEY }, create: { key: SETTINGS_KEY, valueJson: settings as unknown as Prisma.InputJsonValue }, update: { valueJson: settings as unknown as Prisma.InputJsonValue } });
    await tx.appSetting.upsert({ where: { key: WAREHOUSE_MODE_KEY }, create: { key: WAREHOUSE_MODE_KEY, valueJson: { mode: settings.warehouseMode } }, update: { valueJson: { mode: settings.warehouseMode } } });
    for (const item of times) await tx.mealType.update({ where: { id: item.id }, data: { cutoffTime: item.cutoffTime, serviceTime: item.serviceTime } });
    await tx.auditLog.create({ data: { entityType: "AppSetting", entityId: SETTINGS_KEY, action: "UPDATE", actorId: actor.id, actorName: actor.displayName, beforeJson: { settings: beforeSetting, mealTimes: beforeMeals } as unknown as Prisma.InputJsonValue, afterJson: { settings, mealTimes: times } as unknown as Prisma.InputJsonValue, reason: cleanReason } });
    return settings;
  });
}
