import assert from "node:assert/strict";
import test from "node:test";
import { workspaceForRole } from "../src/lib/role-workspace";

test("mỗi vai trò đi thẳng tới workspace sau đăng nhập", () => {
  assert.equal(workspaceForRole("ADMIN"), "/quan-ly");
  assert.equal(workspaceForRole("DIETITIAN"), "/quan-ly");
  assert.equal(workspaceForRole("NURSE"), "/bao-suat");
  assert.equal(workspaceForRole("KITCHEN"), "/bep");
});

test("role không hợp lệ chỉ được quay về trang public", () => {
  assert.equal(workspaceForRole(undefined), "/");
  assert.equal(workspaceForRole("UNKNOWN"), "/");
});
