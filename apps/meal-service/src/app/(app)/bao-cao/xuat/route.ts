import path from "node:path";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { getSessionUser } from "@/lib/auth";
import { parseReportContent, parseReportFormat, parseReportRange, readReportBundle, type ReportData } from "@/lib/reports";

export const runtime = "nodejs";

function safeHtml(value: unknown) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }
function filename(report: ReportData) { return `bao-cao-${report.from}-${report.to}`; }

async function excel(report: ReportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Suất ăn bệnh viện";
  const sections = report.sections ?? [{ title: report.title, columns: report.columns, rows: report.rows }];
  sections.forEach((section, index) => {
    const safeName = section.title.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || `Bao cao ${index + 1}`;
    const sheet = workbook.addWorksheet(safeName, { views: [{ state: "frozen", ySplit: 5 }] });
    sheet.addRow([section.title]); sheet.mergeCells(1, 1, 1, Math.max(section.columns.length, 1));
    sheet.addRow([`Từ ${report.from} đến ${report.to}`]); sheet.mergeCells(2, 1, 2, Math.max(section.columns.length, 1));
    sheet.addRow([`Phạm vi: ${report.scope}`]); sheet.mergeCells(3, 1, 3, Math.max(section.columns.length, 1));
    sheet.addRow([]); sheet.addRow(section.columns.map((column) => column.label));
    section.rows.forEach((row) => sheet.addRow(section.columns.map((column) => row[column.key])));
    sheet.getRow(1).font = { bold: true, size: 16, color: { argb: "FF123C36" } };
    sheet.getRow(5).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F6E56" } };
    sheet.columns.forEach((column) => { column.width = 20; });
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function pdf(report: ReportData) {
  const document = new PDFDocument({ size: "A4", layout: "landscape", margin: 32 });
  const chunks: Buffer[] = []; document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve, reject) => { document.on("end", () => resolve(Buffer.concat(chunks))); document.on("error", reject); });
  const font = path.join(process.cwd(), "..", "..", "node_modules", "@fontsource", "noto-sans", "files", "noto-sans-vietnamese-400-normal.woff2");
  document.registerFont("NotoSans", font).font("NotoSans");
  document.fontSize(18).fillColor("#123c36").text(report.title);
  document.fontSize(9).fillColor("#52645f").text(`Từ ${report.from} đến ${report.to} · Phạm vi: ${report.scope}`); document.moveDown();
  const sections = report.sections ?? [{ title: report.title, columns: report.columns, rows: report.rows }];
  for (const [sectionIndex, section] of sections.entries()) {
    if (sectionIndex && document.y > document.page.height - 110) document.addPage();
    document.fontSize(12).fillColor("#123c36").text(section.title); document.moveDown(.35);
    const widths = section.columns.map(() => (document.page.width - 64) / Math.max(section.columns.length, 1));
    const drawRow = (values: unknown[], header = false) => { const y = document.y; const totalWidth = widths.reduce((a, b) => a + b, 0); if (header) document.rect(32, y, totalWidth, 28).fill("#0f6e56"); else document.rect(32, y, totalWidth, 28).strokeColor("#cdd8d3").stroke(); values.forEach((value, index) => document.fontSize(7).fillColor(header ? "#ffffff" : "#172b27").text(String(value), 32 + widths.slice(0, index).reduce((sum, width) => sum + width, 0) + 4, y + 4, { width: widths[index] - 8, height: 28, ellipsis: true })); document.y = y + 28; };
    drawRow(section.columns.map((column) => column.label), true);
    for (const row of section.rows) { if (document.y > document.page.height - 60) { document.addPage(); drawRow(section.columns.map((column) => column.label), true); } drawRow(section.columns.map((column) => row[column.key])); }
    if (!section.rows.length) document.fontSize(9).fillColor("#667772").text("—  Chưa có dữ liệu trong khoảng đã chọn.", 32, document.y + 8);
    document.moveDown();
  }
  document.end(); return done;
}

function printHtml(report: ReportData) {
  const sections = report.sections ?? [{ title: report.title, columns: report.columns, rows: report.rows }];
  const content = sections.map((section) => { const headers = section.columns.map((column) => `<th>${safeHtml(column.label)}</th>`).join(""); const rows = section.rows.map((row) => `<tr>${section.columns.map((column) => `<td>${safeHtml(row[column.key])}</td>`).join("")}</tr>`).join(""); return `<section><h2>${safeHtml(section.title)}</h2>${rows ? `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>` : "<p>— Chưa có dữ liệu trong khoảng đã chọn.</p>"}</section>`; }).join("");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${safeHtml(report.title)}</title><style>body{font:13px Arial,sans-serif;color:#172b27;margin:28px}h1,h2{color:#123c36}h1{font-size:22px}h2{margin-top:24px;font-size:16px}p{color:#52645f}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{padding:7px;border:1px solid #cdd8d3;text-align:left}th{background:#edf5f2;color:#123c36}@media print{button{display:none}section{break-inside:avoid}}button{padding:10px 16px;background:#0f6e56;color:white;border:0;border-radius:6px}</style></head><body><button onclick="window.print()">In báo cáo</button><h1>${safeHtml(report.title)}</h1><p>Từ ${report.from} đến ${report.to} · Phạm vi: ${safeHtml(report.scope)}</p>${content}<script>window.addEventListener('load',()=>window.print())</script></body></html>`;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Cần đăng nhập.", { status: 401 });
  try {
    const url = new URL(request.url); const range = parseReportRange(url.searchParams.get("from") ?? "", url.searchParams.get("to") ?? ""); const requested = url.searchParams.getAll("content").map(parseReportContent); const contents = requested.includes("full") ? (user.role === "NURSE" ? ["servings", "additions", "menus", "evidence"] : ["servings", "additions", "menus", "evidence", "warehouse"]).map(parseReportContent) : requested; const format = parseReportFormat(url.searchParams.get("format") ?? "");
    if (user.role === "NURSE" && contents.includes("warehouse")) return new Response("Không có quyền xuất nội dung này.", { status: 403 });
    const report = await readReportBundle(contents, range, user);
    if (format === "print") return new Response(printHtml(report), { headers: { "content-type": "text/html; charset=utf-8" } });
    const body = format === "excel" ? await excel(report) : await pdf(report);
    return new Response(new Uint8Array(body), { headers: { "content-type": format === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf", "content-disposition": `attachment; filename="${filename(report)}.${format === "excel" ? "xlsx" : "pdf"}"`, "cache-control": "no-store" } });
  } catch { return new Response("Yêu cầu xuất báo cáo không hợp lệ.", { status: 400 }); }
}
