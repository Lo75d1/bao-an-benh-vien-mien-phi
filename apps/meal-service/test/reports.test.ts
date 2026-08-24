import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReportRows, parseReportContent, parseReportFormat, parseReportRange, scopeDepartmentIds } from "../src/lib/reports";

test("gom nội dung báo cáo đúng khoảng ngày kể cả hai đầu", () => {
  const range = parseReportRange("2026-08-01", "2026-08-31");
  assert.equal(range.from.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(range.to.toISOString(), "2026-08-31T23:59:59.999Z");
  assert.throws(() => parseReportRange("2026-09-01", "2026-08-31"), /Từ ngày/);
});

test("NURSE chỉ dùng scope các khoa thành viên, ADMIN không bị giới hạn", () => {
  assert.deepEqual(scopeDepartmentIds("NURSE", ["khoa-a", "khoa-a", "khoa-b"]), ["khoa-a", "khoa-b"]);
  assert.equal(scopeDepartmentIds("ADMIN", ["khoa-a"]), null);
});

test("định dạng xuất và nội dung chỉ nhận giá trị cho phép", () => {
  assert.equal(parseReportFormat("excel"), "excel");
  assert.equal(parseReportFormat("pdf"), "pdf");
  assert.equal(parseReportFormat("print"), "print");
  assert.equal(parseReportContent("full"), "full");
  assert.equal(parseReportContent("additions"), "additions");
  assert.equal(parseReportContent("menus"), "menus");
  assert.equal(parseReportContent("evidence"), "evidence");
  assert.throws(() => parseReportFormat("csv"), /Định dạng/);
  assert.throws(() => parseReportContent("patients"), /Nội dung/);
});

test("ô thiếu luôn thành dấu gạch, không thành số 0 giả", () => {
  const rows = normalizeReportRows([{ name: "Khoa Nội", quantity: null }, { name: "Khoa Ngoại", quantity: 0 }], [{ key: "name", label: "Khoa" }, { key: "quantity", label: "Số suất" }]);
  assert.equal(rows[0].quantity, "—");
  assert.equal(rows[1].quantity, 0);
});
