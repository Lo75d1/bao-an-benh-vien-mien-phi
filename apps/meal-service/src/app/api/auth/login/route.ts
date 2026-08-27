import { createSession, normalizeEmail, validPassword, verifyPassword } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/patient-note";
import { checkLoginRateLimit, clearLoginFailures, loginRateLimitKey, recordLoginFailure } from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  if (!email || !validPassword(password)) return Response.json({ error: "Thông tin đăng nhập không hợp lệ." }, { status: 400 });

  const ip = clientIpFromHeaders(request.headers.get("x-forwarded-for"), request.headers.get("x-real-ip")) ?? (process.env.NODE_ENV === "production" ? null : "127.0.0.1");
  const salt = process.env.AUTH_RATE_LIMIT_SALT?.trim();
  if (!ip || !salt) return Response.json({ error: "Máy chủ chưa sẵn sàng xác minh đăng nhập." }, { status: 503 });
  const keyHash = loginRateLimitKey(email, ip, salt);
  const retryAfter = await checkLoginRateLimit(keyHash);
  if (retryAfter > 0) return Response.json({ error: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau." }, { status: 429, headers: { "retry-after": String(retryAfter) } });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE" || !verifyPassword(password, user.passwordHash)) {
    await recordLoginFailure(keyHash);
    return Response.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
  }
  await clearLoginFailures(keyHash);
  await createSession(user.id);
  return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, mustChangePassword: user.mustChangePassword } });
}
