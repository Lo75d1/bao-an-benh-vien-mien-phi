import assert from "node:assert/strict";
import test from "node:test";
import { deriveOperationalStatus, getMealBusinessFacts, getMealPhase, getMealState } from "../src/lib/meal-state";

const day = new Date("2026-08-28T00:00:00.000Z");

test("đổi giờ chỉ đổi phase, không tự tạo fact bếp hoặc giao nhận", () => {
  const facts = { dietStatuses: ["PLANNED"] as const, reportedDepartmentCount: 1, totalDepartmentCount: 1, deliveryReceipts: [] };
  const preparation = getMealState([day, "09:00", "11:30", new Date("2026-08-28T03:00:00.000Z")], facts);
  const service = getMealState([day, "09:00", "11:30", new Date("2026-08-28T05:00:00.000Z")], facts);
  const closed = getMealState([day, "09:00", "11:30", new Date("2026-08-28T06:31:00.000Z")], facts);
  assert.equal(preparation.phase, "PREPARATION");
  assert.equal(service.phase, "SERVICE");
  assert.equal(closed.phase, "CLOSED");
  assert.deepEqual(preparation.businessFacts, service.businessFacts);
  assert.deepEqual(service.businessFacts, closed.businessFacts);
  assert.equal(closed.businessFacts.kitchen, "NOT_STARTED");
  assert.equal(closed.businessFacts.delivery, "UNCONFIRMED");
});

test("fact PREPARED và receipt FULL/SHORT giữ nguyên qua phase và reload", () => {
  const fullInput = { dietStatuses: ["PREPARED"] as const, reportedDepartmentCount: 1, totalDepartmentCount: 1, deliveryReceipts: [{ status: "FULL" as const }], mealPhotoCount: 1 };
  const before = getMealState([day, "09:00", "11:30", new Date("2026-08-28T04:00:00.000Z")], fullInput);
  const after = getMealState([day, "09:00", "11:30", new Date("2026-08-28T07:00:00.000Z")], fullInput);
  assert.equal(before.businessFacts.kitchen, "PREPARED");
  assert.equal(after.businessFacts.kitchen, "PREPARED");
  assert.equal(after.businessFacts.delivery, "FULL");
  assert.deepEqual(getMealBusinessFacts(fullInput), getMealBusinessFacts(fullInput));

  const short = getMealBusinessFacts({ ...fullInput, deliveryReceipts: [{ status: "SHORT" }] });
  assert.equal(short.delivery, "SHORT");
});

test("bếp thường và Sonde dùng lịch riêng", () => {
  const now = new Date("2026-08-28T03:30:00.000Z"); // 10:30 Việt Nam
  assert.equal(getMealPhase(day, "09:00", "11:30", now), "PREPARATION");
  assert.equal(getMealPhase(day, "10:45", "12:00", now), "REPORTING");
});

test("ảnh và mẫu lưu là fact độc lập với phase", () => {
  const facts = getMealBusinessFacts({ dietStatuses: ["PREPARING"], mealPhotoCount: 0, retention24hRequired: true, retention24hCount: 0 });
  assert.equal(facts.kitchen, "IN_PROGRESS");
  assert.equal(facts.mealPhoto, "MISSING");
  assert.equal(facts.retention24h, "REQUIRED");
});

test("trạng thái điều hành ưu tiên receipt, handoff, bếp rồi báo suất", () => {
  assert.equal(deriveOperationalStatus({ hasReceipt: true, hasHandoff: true, kitchen: "IN_PROGRESS", report: "SENT" }).label, "Khoa đã nhận");
  assert.equal(deriveOperationalStatus({ hasHandoff: true, kitchen: "IN_PROGRESS", report: "SENT" }).label, "Đã bàn giao khoa");
  assert.equal(deriveOperationalStatus({ kitchen: "IN_PROGRESS", report: "SENT" }).label, "Bếp đang chuẩn bị");
  assert.equal(deriveOperationalStatus({ kitchen: "NOT_STARTED", report: "SENT" }).label, "Báo đầy đủ");
  assert.equal(deriveOperationalStatus({ kitchen: "NOT_STARTED", report: "PARTIAL" }).label, "Chưa báo đủ");
  assert.equal(deriveOperationalStatus({ kitchen: "NOT_STARTED", report: "NOT_SENT" }).label, "Chờ báo");
});
