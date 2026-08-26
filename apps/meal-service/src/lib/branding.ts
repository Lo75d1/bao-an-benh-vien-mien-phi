import type { Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";

export const BRANDING_KEY = "branding";
export const DEFAULT_BRANDING: BrandingSettings = {
  organizationName: "Suất ăn bệnh viện",
  shortName: "SA",
  primaryColor: "#DDF1EA",
  logoDataUrl: null,
  publicPrimaryColor: "#153B5B",
  publicAccentColor: "#2F80B7",
  publicHeroEnabled: true,
  publicHeroImageDataUrl: null,
};

export type BrandingSettings = {
  organizationName: string;
  shortName: string;
  primaryColor: string;
  logoDataUrl: string | null;
  publicPrimaryColor: string;
  publicAccentColor: string;
  publicHeroEnabled: boolean;
  publicHeroImageDataUrl: string | null;
};

const HEX_COLOR = /^#[0-9A-F]{6}$/;
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const HERO_DATA_URL = /^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function parseBrandingSettings(value: unknown): BrandingSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_BRANDING };
  const source = value as Record<string, unknown>;
  return {
    organizationName: typeof source.organizationName === "string" && source.organizationName.trim().length >= 2 ? source.organizationName.trim().slice(0, 100) : DEFAULT_BRANDING.organizationName,
    shortName: typeof source.shortName === "string" && source.shortName.trim().length >= 1 ? source.shortName.trim().toUpperCase().slice(0, 5) : DEFAULT_BRANDING.shortName,
    primaryColor: typeof source.primaryColor === "string" && HEX_COLOR.test(source.primaryColor.toUpperCase()) ? source.primaryColor.toUpperCase() : DEFAULT_BRANDING.primaryColor,
    logoDataUrl: typeof source.logoDataUrl === "string" && source.logoDataUrl.length <= 410_000 && LOGO_DATA_URL.test(source.logoDataUrl) ? source.logoDataUrl : null,
    publicPrimaryColor: typeof source.publicPrimaryColor === "string" && HEX_COLOR.test(source.publicPrimaryColor.toUpperCase()) ? source.publicPrimaryColor.toUpperCase() : DEFAULT_BRANDING.publicPrimaryColor,
    publicAccentColor: typeof source.publicAccentColor === "string" && HEX_COLOR.test(source.publicAccentColor.toUpperCase()) ? source.publicAccentColor.toUpperCase() : DEFAULT_BRANDING.publicAccentColor,
    publicHeroEnabled: typeof source.publicHeroEnabled === "boolean" ? source.publicHeroEnabled : DEFAULT_BRANDING.publicHeroEnabled,
    publicHeroImageDataUrl: typeof source.publicHeroImageDataUrl === "string" && source.publicHeroImageDataUrl.length <= 2_100_000 && HERO_DATA_URL.test(source.publicHeroImageDataUrl) ? source.publicHeroImageDataUrl : null,
  };
}

export function validateBrandingSettings(input: BrandingSettings): BrandingSettings {
  const organizationName = input.organizationName.trim();
  const shortName = input.shortName.trim().toUpperCase();
  const primaryColor = input.primaryColor.trim().toUpperCase();
  if (organizationName.length < 2 || organizationName.length > 100) throw new Error("Tên bệnh viện cần từ 2 đến 100 ký tự.");
  if (!/^[\p{L}\p{N}]{1,5}$/u.test(shortName)) throw new Error("Tên viết tắt cần từ 1 đến 5 chữ hoặc số.");
  if (!HEX_COLOR.test(primaryColor)) throw new Error("Màu chủ đạo phải có dạng #123C36.");
  if (input.logoDataUrl !== null && (input.logoDataUrl.length > 410_000 || !LOGO_DATA_URL.test(input.logoDataUrl))) throw new Error("Logo không hợp lệ hoặc vượt quá giới hạn.");
  const publicPrimaryColor = input.publicPrimaryColor.trim().toUpperCase();
  const publicAccentColor = input.publicAccentColor.trim().toUpperCase();
  if (!HEX_COLOR.test(publicPrimaryColor) || !HEX_COLOR.test(publicAccentColor)) throw new Error("Màu trang chủ công khai phải có dạng #153B5B.");
  if (input.publicHeroImageDataUrl !== null && (input.publicHeroImageDataUrl.length > 2_100_000 || !HERO_DATA_URL.test(input.publicHeroImageDataUrl))) throw new Error("Ảnh nền trang chủ không hợp lệ hoặc vượt quá giới hạn.");
  return { organizationName, shortName, primaryColor, logoDataUrl: input.logoDataUrl, publicPrimaryColor, publicAccentColor, publicHeroEnabled: input.publicHeroEnabled, publicHeroImageDataUrl: input.publicHeroImageDataUrl };
}

export function readableForeground(hex: string): "#FFFFFF" | "#17241F" {
  const normalized = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.068;
  return whiteContrast >= darkContrast ? "#FFFFFF" : "#17241F";
}

export function blendHex(hex: string, target: "#FFFFFF" | "#000000", targetWeight: number): string {
  const source = hex.replace("#", "");
  const destination = target.replace("#", "");
  const channel = (offset: number) => Math.round(Number.parseInt(source.slice(offset, offset + 2), 16) * (1 - targetWeight) + Number.parseInt(destination.slice(offset, offset + 2), 16) * targetWeight).toString(16).padStart(2, "0");
  return `#${channel(0)}${channel(2)}${channel(4)}`.toUpperCase();
}

export async function readBrandingSettings(client: Prisma.TransactionClient | typeof prisma = prisma): Promise<BrandingSettings> {
  // Docker build prerenders the global not-found page before a runtime database
  // is attached. Runtime containers always provide DATABASE_URL via compose.
  if (!process.env.DATABASE_URL) return { ...DEFAULT_BRANDING };
  const row = await client.appSetting.findUnique({ where: { key: BRANDING_KEY }, select: { valueJson: true } });
  return row ? parseBrandingSettings(row.valueJson) : { ...DEFAULT_BRANDING };
}

export async function updateBrandingSettings(input: BrandingSettings, actor: { id: string; displayName: string; role: Role }, reason: string) {
  if (actor.role !== "ADMIN") throw new Error("Chỉ quản trị viên được đổi nhận diện bệnh viện.");
  const branding = validateBrandingSettings(input);
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 500) throw new Error("Lý do thay đổi phải có từ 3 đến 500 ký tự.");
  return prisma.$transaction(async (tx) => {
    const before = await readBrandingSettings(tx);
    await tx.appSetting.upsert({ where: { key: BRANDING_KEY }, create: { key: BRANDING_KEY, valueJson: branding as unknown as Prisma.InputJsonValue }, update: { valueJson: branding as unknown as Prisma.InputJsonValue } });
    await tx.auditLog.create({ data: { entityType: "AppSetting", entityId: BRANDING_KEY, action: "UPDATE_BRANDING", actorId: actor.id, actorName: actor.displayName, beforeJson: before as unknown as Prisma.InputJsonValue, afterJson: branding as unknown as Prisma.InputJsonValue, reason: cleanReason } });
    return branding;
  });
}
