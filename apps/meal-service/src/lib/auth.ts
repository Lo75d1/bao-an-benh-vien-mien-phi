import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { FeedingRoute, Role } from "@prisma/client";
import type { Language } from "./i18n";
import { prisma } from "./prisma";
export { hashPassword, verifyPassword } from "./password";
import { verifyPassword } from "./password";
export const SESSION_COOKIE = "meal_service_session";
const MAX_AGE = 60 * 60 * 24 * 14;
export type SessionUser = { id: string; email: string; displayName: string; role: Role; kitchenRoute: FeedingRoute | null; mustChangePassword: boolean; language: Language };
export function normalizeEmail(value: unknown) { if (typeof value !== "string") return null; const email = value.trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null; }
export function validPassword(value: unknown): value is string { return typeof value === "string" && value.length >= 10 && value.length <= 256; }
export const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");
export async function createSession(userId: string) { const token = randomBytes(32).toString("base64url"); await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + MAX_AGE * 1000) } }); (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.INSECURE_COOKIES !== "1" && process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE }); }
export async function clearSession() { const store = await cookies(); const token = store.get(SESSION_COOKIE)?.value; if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }); store.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 }); }
export async function getSessionUser(options: { allowPasswordChange?: boolean } = {}): Promise<SessionUser | null> { const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) return null; const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { id: true, email: true, displayName: true, role: true, kitchenRoute: true, mustChangePassword: true, language: true, status: true } } } }); if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null; if (session.user.mustChangePassword && !options.allowPasswordChange) return null; return { ...session.user, language: session.user.language === "en" ? "en" : "vi" }; }
