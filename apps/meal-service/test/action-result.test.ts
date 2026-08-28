import assert from "node:assert/strict";
import test from "node:test";
import { actionFailure, actionSuccess, INITIAL_ACTION_RESULT } from "../src/lib/action-result";

test("action result có trạng thái rõ cho idle, success và error", () => {
  assert.deepEqual(INITIAL_ACTION_RESULT, { status: "idle", message: "" });
  assert.deepEqual(actionSuccess("Đã lưu"), { status: "success", message: "Đã lưu" });
  assert.deepEqual(actionFailure(new Error("Dữ liệu chưa hợp lệ")), { status: "error", message: "Dữ liệu chưa hợp lệ" });
});

test("lỗi không xác định không làm rỗng feedback", () => {
  assert.equal(actionFailure(null).status, "error");
  assert.match(actionFailure(null).message, /Không thể hoàn tất/);
});
