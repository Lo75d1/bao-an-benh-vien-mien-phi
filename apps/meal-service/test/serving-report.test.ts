import assert from "node:assert/strict";
import test from "node:test";
import { aggregateHospitalServings, assertServingReportNotSubmitted, buildServingSnapshot, cutoffAt, hospitalDate, isBeforeCutoff, normalizeServingNote, requireNurseDepartment } from "../src/lib/serving-report";

test("cộng báo suất đa khoa theo từng chế độ", () => {
  const totals = aggregateHospitalServings([{ dietTypeId: "thuong", quantity: 20 }, { dietTypeId: "dtd", quantity: 8 }, { dietTypeId: "thuong", quantity: 13 }, { dietTypeId: "dtd", quantity: 4 }]);
  assert.equal(totals.get("thuong"), 33);
  assert.equal(totals.get("dtd"), 12);
});

test("NURSE chỉ có đúng một khoa tự động và role khác bị từ chối", () => {
  assert.equal(requireNurseDepartment("NURSE", ["noi", "noi"]), "noi");
  assert.throws(() => requireNurseDepartment("NURSE", []), /chưa được gán khoa/);
  assert.throws(() => requireNurseDepartment("NURSE", ["noi", "ngoai"]), /nhiều khoa/);
  assert.throws(() => requireNurseDepartment("DIETITIAN", ["noi"]), /Chỉ điều dưỡng/);
});

test("ghi chú nội bộ và bệnh nhân được chuẩn hóa độc lập", () => {
  const internal = normalizeServingNote("  Không dùng thìa nhựa  ");
  const patientVisible = normalizeServingNote("  Suất ăn ít muối  ");
  assert.equal(internal, "Không dùng thìa nhựa");
  assert.equal(patientVisible, "Suất ăn ít muối");
  assert.notEqual(internal, patientVisible);
  assert.equal(normalizeServingNote("  "), null);
});

test("giờ chốt dùng múi giờ Việt Nam và chỉ cho sửa trước chốt", () => {
  const mealDate = new Date("2026-08-21T00:00:00.000Z");
  assert.equal(cutoffAt(mealDate, "09:00")?.toISOString(), "2026-08-21T02:00:00.000Z");
  assert.equal(isBeforeCutoff(mealDate, "09:00", new Date("2026-08-21T01:59:59.000Z")), true);
  assert.equal(isBeforeCutoff(mealDate, "09:00", new Date("2026-08-21T02:00:00.000Z")), false);
});

test("ngày báo suất dùng ngày Việt Nam kể cả khi UTC còn là ngày trước", () => {
  assert.equal(hospitalDate(new Date("2026-08-20T18:30:00.000Z")).toISOString(), "2026-08-21T00:00:00.000Z");
});

test("audit before/after giữ riêng số suất và hai loại ghi chú", () => {
  const before = buildServingSnapshot({ departmentId: "noi", mealEventId: "trua", lines: [{ dietTypeId: "thuong", quantity: 20, internalNote: "Nội bộ", patientVisibleNote: null }] });
  const after = buildServingSnapshot({ departmentId: "noi", mealEventId: "trua", lines: [{ dietTypeId: "thuong", quantity: 22, internalNote: "Nội bộ mới", patientVisibleNote: "Ít muối" }] });
  assert.equal(before.lines[0].quantity, 20);
  assert.equal(after.lines[0].quantity, 22);
  assert.equal(after.lines[0].internalNote, "Nội bộ mới");
  assert.equal(after.lines[0].patientVisibleNote, "Ít muối");
});

test("mỗi khoa chỉ được xác nhận báo suất một lần cho một bữa", () => {
  assert.doesNotThrow(() => assertServingReportNotSubmitted(null));
  assert.throws(() => assertServingReportNotSubmitted("report-da-gui"), /đã được xác nhận/);
});
