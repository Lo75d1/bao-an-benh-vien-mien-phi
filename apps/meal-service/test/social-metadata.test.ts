import assert from "node:assert/strict";
import test from "node:test";
import { composeSocialMetadata } from "../src/lib/social-metadata";

test("demo social metadata uses the public demo URL", () => {
  const metadata = composeSocialMetadata(new URL("https://suatanbv.io.vn"), "vi", "/demo");
  assert.equal(metadata.alternates?.canonical, "https://suatanbv.io.vn/demo");
  assert.equal(metadata.openGraph?.url, "https://suatanbv.io.vn/demo");
  assert.deepEqual(metadata.twitter?.images, ["https://suatanbv.io.vn/branding/social-preview.png"]);
});
