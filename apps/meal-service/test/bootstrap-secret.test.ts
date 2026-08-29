import assert from "node:assert/strict";
import test from "node:test";
import { validateServerSecret } from "../src/lib/bootstrap-setup";

test("bootstrap secret yếu hoặc placeholder bị từ chối", () => {
  assert.throws(() => validateServerSecret("short", "BOOTSTRAP_SETUP_TOKEN"), /an toàn/);
  assert.throws(() => validateServerSecret("thay-bang-ma-khoi-tao-server-toi-thieu-32-ky-tu", "BOOTSTRAP_SETUP_TOKEN"), /an toàn/);
  assert.throws(() => validateServerSecret("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "BOOTSTRAP_SETUP_TOKEN"), /an toàn/);
});

test("bootstrap secret ngẫu nhiên đủ mạnh được chấp nhận", () => {
  const strong = "rQ7dE4uJ9wX2cV8mN5pK1sH6zB3fT0yL";
  assert.equal(validateServerSecret(strong, "BOOTSTRAP_SETUP_TOKEN"), strong);
});
