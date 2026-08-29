import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { verifyPassword } from "./password";
import { prisma } from "./prisma";
import { readSetupCompletion } from "./first-time-setup";

const COOKIE = "meal_service_bootstrap";
const MAX_AGE = 60 * 60 * 2;
const UNSAFE_SECRET_MARKERS = ["thay-bang", "change-me", "changeme", "example", "default", "placeholder"];
type BootstrapState = { authorizedAt: string; adminId?: string };

export function validateServerSecret(value: string | undefined, label: string, minimumLength = 32): string {
  const normalized = value?.trim() ?? "";
  const lowered = normalized.toLowerCase();
  if (
    normalized.length < minimumLength
    || new Set(normalized).size < 12
    || UNSAFE_SECRET_MARKERS.some((marker) => lowered.includes(marker))
  ) throw new Error(`Máy chủ chưa cấu hình ${label} an toàn.`);
  return normalized;
}

function secret() {
  return validateServerSecret(process.env.APP_SECRET, "APP_SECRET");
}

function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
function encode(state: BootstrapState) {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function decode(value?: string): BootstrapState | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as BootstrapState;
    return Date.now() - Date.parse(state.authorizedAt) <= MAX_AGE * 1000 ? state : null;
  } catch { return null; }
}

async function write(state: BootstrapState) {
  (await cookies()).set(COOKIE, encode(state), { httpOnly: true, sameSite: "strict", secure: process.env.INSECURE_COOKIES !== "1" && process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function authorizeBootstrap(token: string) {
  if (await readSetupCompletion()) throw new Error("Hệ thống đã được khởi tạo; cổng bootstrap đã khóa.");
  const configured = validateServerSecret(process.env.BOOTSTRAP_SETUP_TOKEN, "BOOTSTRAP_SETUP_TOKEN");
  const actual = Buffer.from(token);
  const expected = Buffer.from(configured);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Mã khởi tạo không đúng.");
  await write({ authorizedAt: new Date().toISOString() });
}

export async function readBootstrapState() { return decode((await cookies()).get(COOKIE)?.value); }

export async function confirmBootstrapAdmin(email: string, password: string) {
  if (await readSetupCompletion()) throw new Error("Hệ thống đã được khởi tạo; cổng bootstrap đã khóa.");
  const state = await readBootstrapState();
  if (!state) throw new Error("Phiên khởi tạo không hợp lệ hoặc đã hết hạn.");
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE" || !verifyPassword(password, user.passwordHash)) throw new Error("Tài khoản Admin khởi tạo không hợp lệ.");
  await write({ ...state, adminId: user.id });
  return user;
}

export async function requireBootstrapAdmin(options: { allowUnconfirmed?: boolean } = {}) {
  if (await readSetupCompletion()) throw new Error("Hệ thống đã được khởi tạo; cổng bootstrap đã khóa.");
  const state = await readBootstrapState();
  if (!state) throw new Error("Cần nhập mã khởi tạo server trước.");
  const user = state.adminId
    ? await prisma.user.findUnique({ where: { id: state.adminId } })
    : options.allowUnconfirmed
      ? await prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE" }, orderBy: { createdAt: "asc" } })
      : null;
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") throw new Error("Cần xác nhận tài khoản Admin đầu tiên.");
  return user;
}

export async function clearBootstrap() { (await cookies()).set(COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 }); }
