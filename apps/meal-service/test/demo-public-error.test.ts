import assert from "node:assert/strict";
import test from "node:test";
import { publicDemoError } from "../src/lib/demo-public-error";

test("không lộ lỗi Prisma hoặc địa chỉ database trên trang Demo", () => {
  const safe = publicDemoError(Object.assign(new Error("Can't reach database server at db:5432"), { name: "PrismaClientInitializationError" }));
  assert.equal(safe.status, 503);
  assert.doesNotMatch(safe.message, /Prisma|db:5432|database/i);
});

test("lỗi nghiệp vụ Demo vẫn giữ thông báo có ích", () => {
  assert.deepEqual(publicDemoError(new Error("Phiên Demo đã hết hạn.")), { status: 400, message: "Phiên Demo đã hết hạn." });
});
