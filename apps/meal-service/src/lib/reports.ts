import type { Role } from "@prisma/client";
import { prisma } from "./prisma";

export const REPORT_CONTENTS = ["servings", "additions", "warehouse"] as const;
export type ReportContent = (typeof REPORT_CONTENTS)[number];
export type ReportFormat = "excel" | "pdf" | "print";
export type ReportCell = string | number;
export type ReportRow = Record<string, ReportCell | null | undefined>;
export type ReportData = { title: string; from: string; to: string; scope: string; columns: { key: string; label: string }[]; rows: Record<string, ReportCell>[] };
export type ReportActor = { id: string; role: Role };

const CONTENT_LABEL: Record<ReportContent, string> = { servings: "Báo suất theo khoa", additions: "Suất bổ sung", warehouse: "Nhập, xuất và điều chỉnh kho" };
const MISSING = "—";

export function parseReportRange(fromValue: string, toValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromValue) || !/^\d{4}-\d{2}-\d{2}$/.test(toValue)) throw new Error("Khoảng ngày không hợp lệ.");
  const from = new Date(`${fromValue}T00:00:00.000Z`);
  const to = new Date(`${toValue}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error("Từ ngày phải trước hoặc bằng đến ngày.");
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000);
  if (days > 366) throw new Error("Mỗi lần chỉ xuất tối đa 367 ngày.");
  return { from, to, fromValue, toValue };
}

export function parseReportContent(value: string): ReportContent {
  if (!REPORT_CONTENTS.includes(value as ReportContent)) throw new Error("Nội dung báo cáo không hợp lệ.");
  return value as ReportContent;
}

export function parseReportFormat(value: string): ReportFormat {
  if (!(["excel", "pdf", "print"] as const).includes(value as ReportFormat)) throw new Error("Định dạng xuất không hợp lệ.");
  return value as ReportFormat;
}

export function scopeDepartmentIds(role: Role, membershipIds: string[]) {
  return role === "NURSE" ? [...new Set(membershipIds)] : null;
}

export function normalizeReportRows(rows: ReportRow[], columns: ReportData["columns"]) {
  return rows.map((row) => Object.fromEntries(columns.map(({ key }) => {
    const value = row[key];
    return [key, value === null || value === undefined || value === "" ? MISSING : value];
  })) as Record<string, ReportCell>);
}

function dateCell(value: Date) { return value.toISOString().slice(0, 10); }
function dateTimeCell(value: Date | null) { return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(value) : null; }

export async function readReport(content: ReportContent, range: ReturnType<typeof parseReportRange>, actor: ReportActor): Promise<ReportData> {
  const memberships = actor.role === "NURSE" ? await prisma.departmentMembership.findMany({ where: { userId: actor.id }, include: { department: { select: { id: true, name: true } } } }) : [];
  const departmentIds = scopeDepartmentIds(actor.role, memberships.map((item) => item.departmentId));
  const scope = departmentIds ? (memberships.length ? memberships.map((item) => item.department.name).join(", ") : "—") : "Toàn viện";
  const base = { title: CONTENT_LABEL[content], from: range.fromValue, to: range.toValue, scope };

  if (content === "servings") {
    const columns = [{ key: "date", label: "Ngày" }, { key: "meal", label: "Bữa" }, { key: "department", label: "Khoa" }, { key: "diet", label: "Chế độ" }, { key: "quantity", label: "Suất gốc" }, { key: "status", label: "Trạng thái báo" }, { key: "submittedAt", label: "Gửi lúc" }];
    const reports = await prisma.servingReport.findMany({ where: { mealEvent: { mealDate: { gte: range.from, lte: range.to } }, ...(departmentIds ? { departmentId: { in: departmentIds } } : {}) }, include: { department: true, mealEvent: { include: { mealType: true } }, lines: { include: { dietType: true } } }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { department: { name: "asc" } }] });
    const rows = reports.flatMap((report) => report.lines.map((line) => ({ date: dateCell(report.mealEvent.mealDate), meal: report.mealEvent.mealType.name, department: report.department.name, diet: `${line.dietType.code} — ${line.dietType.name}`, quantity: line.quantity, status: report.status, submittedAt: dateTimeCell(report.submittedAt) })));
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (content === "additions") {
    const columns = [{ key: "date", label: "Ngày" }, { key: "meal", label: "Bữa" }, { key: "department", label: "Khoa" }, { key: "diet", label: "Chế độ" }, { key: "quantity", label: "Suất bổ sung" }, { key: "kind", label: "Loại" }, { key: "ack", label: "Bếp xử lý" }, { key: "reason", label: "Lý do" }];
    const additions = await prisma.lateMealAddition.findMany({ where: { mealEvent: { mealDate: { gte: range.from, lte: range.to } }, ...(departmentIds ? { departmentId: { in: departmentIds } } : {}) }, include: { department: true, mealEvent: { include: { mealType: true } }, dietType: true }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { submittedAt: "asc" }] });
    const rows = additions.map((item) => ({ date: dateCell(item.mealEvent.mealDate), meal: item.mealEvent.mealType.name, department: item.department.name, diet: `${item.dietType.code} — ${item.dietType.name}`, quantity: item.quantity, kind: item.kind, ack: item.ackStatus, reason: item.reason }));
    return { ...base, columns, rows: normalizeReportRows(rows, columns) };
  }
  if (actor.role === "NURSE") return { ...base, columns: [], rows: [] };
  const columns = [{ key: "occurredAt", label: "Thời điểm" }, { key: "warehouse", label: "Kho" }, { key: "type", label: "Loại" }, { key: "item", label: "Mặt hàng" }, { key: "quantity", label: "Số lượng" }, { key: "unit", label: "Đơn vị" }, { key: "unitPrice", label: "Đơn giá" }, { key: "status", label: "Trạng thái" }];
  const transactions = await prisma.inventoryTransaction.findMany({ where: { occurredAt: { gte: range.from, lte: range.to } }, include: { warehouse: true, lines: true }, orderBy: { occurredAt: "asc" } });
  const rows = transactions.flatMap((transaction) => transaction.lines.map((line) => ({ occurredAt: dateTimeCell(transaction.occurredAt), warehouse: transaction.warehouse.name, type: transaction.type, item: line.itemName, quantity: Number(line.quantity), unit: line.unit, unitPrice: line.unitPrice == null ? null : Number(line.unitPrice), status: transaction.status })));
  return { ...base, columns, rows: normalizeReportRows(rows, columns) };
}

export async function readAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 200) });
}
