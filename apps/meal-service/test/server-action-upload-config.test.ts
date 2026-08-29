import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config";

test("Server Actions accept the multi-photo kitchen completion payload", () => {
  assert.equal(nextConfig.experimental?.serverActions?.bodySizeLimit, "48mb");
});
