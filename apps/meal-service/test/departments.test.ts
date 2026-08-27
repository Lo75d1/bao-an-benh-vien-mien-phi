import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateDepartmentInput } from "../src/lib/departments";

describe("validateDepartmentInput", () => {
  it("chuẩn hóa mã và tên khoa", () => assert.deepEqual(validateDepartmentInput({ code: " noi_1 ", name: " Khoa Nội " }), { code: "NOI_1", name: "Khoa Nội" }));
  it("từ chối mã không hợp lệ", () => assert.throws(() => validateDepartmentInput({ code: "?", name: "Khoa Nội" }), /Mã khoa/));
  it("từ chối tên quá ngắn", () => assert.throws(() => validateDepartmentInput({ code: "NOI", name: "N" }), /Tên khoa/));
});
