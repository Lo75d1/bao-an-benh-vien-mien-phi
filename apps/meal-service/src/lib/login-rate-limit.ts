import { createHmac } from "node:crypto";
import { prisma } from "./prisma";

export const LOGIN_LIMIT = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_BLOCK_MS = 15 * 60 * 1000;

export function loginRateLimitKey(email: string, ip: string, salt: string): string {
  if (salt.length < 16) throw new Error("Máy chủ chưa cấu hình khóa giới hạn đăng nhập.");
  return createHmac("sha256", salt).update(`${email}\n${ip}`).digest("base64url");
}

export function loginRetryAfter(blockedUntil: Date | null, now = new Date()): number {
  return blockedUntil && blockedUntil > now ? Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)) : 0;
}

export async function checkLoginRateLimit(keyHash: string, now = new Date()) {
  const record = await prisma.loginRateLimit.findUnique({ where: { keyHash }, select: { blockedUntil: true } });
  return loginRetryAfter(record?.blockedUntil ?? null, now);
}

export async function recordLoginFailure(keyHash: string, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.loginRateLimit.findUnique({ where: { keyHash } });
    const expired = !current || now.getTime() - current.windowStartedAt.getTime() >= LOGIN_WINDOW_MS;
    const attempts = expired ? 1 : current.attempts + 1;
    const blockedUntil = attempts >= LOGIN_LIMIT ? new Date(now.getTime() + LOGIN_BLOCK_MS) : null;
    await tx.loginRateLimit.upsert({
      where: { keyHash },
      create: { keyHash, attempts, windowStartedAt: now, blockedUntil },
      update: { attempts, windowStartedAt: expired ? now : current!.windowStartedAt, blockedUntil },
    });
  }, { isolationLevel: "Serializable" });
}

export async function clearLoginFailures(keyHash: string) {
  await prisma.loginRateLimit.deleteMany({ where: { keyHash } });
}
