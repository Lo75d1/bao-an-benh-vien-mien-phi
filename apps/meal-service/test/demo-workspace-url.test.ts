import assert from "node:assert/strict";
import test from "node:test";
import { workspaceHrefWithDemoTime } from "../src/lib/demo-workspace-url";

test("giữ cùng demoNow khi chuyển liên tiếp qua các workspace", () => {
  const demoNow = "2026-08-29T11:00:00.000Z";
  for (const href of ["/bep", "/quan-ly", "/bep"])
    assert.equal(workspaceHrefWithDemoTime(href, demoNow), `${href}?demoNow=${encodeURIComponent(demoNow)}`);
});

test("không có demoNow thì giữ nguyên href", () => {
  assert.equal(workspaceHrefWithDemoTime("/thuc-don", null), "/thuc-don");
});
