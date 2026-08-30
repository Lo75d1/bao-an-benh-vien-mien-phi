import assert from "node:assert/strict";
import test from "node:test";
import { imageTargetBytes } from "../src/lib/client-image-upload";

test("shares the proxy-safe upload budget across all selected kitchen photos", () => {
  assert.equal(imageTargetBytes(1), 800 * 1024);
  assert.equal(imageTargetBytes(2), 400 * 1024);
  assert.equal(imageTargetBytes(4), 200 * 1024);
});

test("keeps a safe minimum target for an unusually large number of photos", () => {
  assert.equal(imageTargetBytes(20), 48 * 1024);
});
