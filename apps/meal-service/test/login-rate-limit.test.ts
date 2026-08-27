import assert from "node:assert/strict";
import test from "node:test";
import { LOGIN_BLOCK_MS, loginRateLimitKey, loginRetryAfter } from "../src/lib/login-rate-limit";

test("khóa giới hạn đăng nhập không lưu email hoặc IP thô", () => {
  const key = loginRateLimitKey("nurse@example.test", "203.0.113.8", "a-private-login-salt");
  assert.equal(key.includes("nurse@example.test"), false);
  assert.equal(key.includes("203.0.113.8"), false);
  assert.equal(key, loginRateLimitKey("nurse@example.test", "203.0.113.8", "a-private-login-salt"));
});

test("Retry-After làm tròn lên và hết hiệu lực đúng giờ", () => {
  const now = new Date("2026-08-27T08:00:00.000Z");
  assert.equal(loginRetryAfter(new Date(now.getTime() + LOGIN_BLOCK_MS), now), 900);
  assert.equal(loginRetryAfter(new Date(now.getTime() - 1), now), 0);
  assert.equal(loginRetryAfter(null, now), 0);
});
