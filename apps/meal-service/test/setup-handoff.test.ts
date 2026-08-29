import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildHandoffDocx, buildHandoffXlsx, safeHandoffFilename } from "../src/lib/setup-handoff";

const data = {
  branding: { organizationName: "Bệnh viện Việt Nam", shortName: "BV", primaryColor: "#DDF1EA", logoDataUrl: null, publicPrimaryColor: "#153B5B", publicAccentColor: "#2F80B7", publicHeroEnabled: true, publicHeroImageDataUrl: null },
  settings: { sondeEnabled: true }, completion: { completedAt: "2026-08-29T00:00:00.000Z", completedById: "admin", version: 1 },
  users: [
    { id: "admin", displayName: "Quản trị", email: "admin@bv.local", role: "ADMIN", status: "ACTIVE", kitchenRoute: null, mustChangePassword: true, memberships: [] },
    { id: "nurse", displayName: "Điều dưỡng Nội", email: "noi@bv.local", role: "NURSE", status: "ACTIVE", kitchenRoute: null, mustChangePassword: true, memberships: [{ department: { name: "Khoa Nội" } }] },
  ],
  departments: [{ code: "NOI", name: "Khoa Nội", status: "ACTIVE", memberships: [{}] }],
  meals: [{ feedingRoute: "NORMAL", name: "Trưa", cutoffTime: "09:00", serviceTime: "11:30", status: "ACTIVE" }],
  diets: [{ code: "COM", name: "Cơm thường", feedingRoute: "NORMAL", status: "ACTIVE" }],
} as never;

test("XLSX bàn giao một lần có mật khẩu tạm, bản tải lại không có", async () => {
  const once = await buildHandoffXlsx(data, [{ userId: "nurse", password: "BV-temporary" }]);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(once as never);
  const values = workbook.getWorksheet("TAI_KHOAN")!.getRow(1).values as unknown[];
  assert.ok(values.includes("Mật khẩu tạm (chỉ xuất lần này)"));
  assert.equal(workbook.getWorksheet("TAI_KHOAN")!.getCell("I3").value, "BV-temporary");
  const later = await buildHandoffXlsx(data); const reload = new ExcelJS.Workbook(); await reload.xlsx.load(later as never);
  assert.ok(!(reload.getWorksheet("TAI_KHOAN")!.getRow(1).values as unknown[]).includes("Mật khẩu tạm (chỉ xuất lần này)"));
});

test("DOCX hợp lệ và không chứa mật khẩu tạm", async () => {
  const file = await buildHandoffDocx(data, "https://suatan.example.vn");
  assert.equal(file.subarray(0, 2).toString(), "PK");
  assert.equal(file.includes(Buffer.from("BV-temporary")), false);
  assert.equal(safeHandoffFilename("Bệnh viện Việt Nam", "docx", new Date("2026-08-29")), "benh-vien-viet-nam-2026-08-29.docx");
});
