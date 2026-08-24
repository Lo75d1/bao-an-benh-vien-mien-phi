import assert from "node:assert/strict";
import test from "node:test";
import { hashPublicVisitor } from "../src/lib/public-page-views";

test("mã trình duyệt được băm ổn định và không lưu giá trị thô", () => {
  const visitorId = "visitor-demo-123";
  const first = hashPublicVisitor(visitorId);
  assert.equal(first, hashPublicVisitor(visitorId));
  assert.notEqual(first, visitorId);
  assert.equal(first.length > 20, true);
});
