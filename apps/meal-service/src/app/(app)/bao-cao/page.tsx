import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/presentation";
import { FileDown, FileSpreadsheet, Printer, ShieldCheck } from "lucide-react";
import { localizeReportData, parseReportContent, parseReportRange, readReportBundle } from "@/lib/reports";
import { clampDateToDataStart, readOperationalSettings } from "@/lib/settings";
import { ReportPreview } from "./report-table";
import { ReportNavigation, type ReportNavigationItem } from "./report-navigation";
import { normalizeLanguage } from "@/lib/i18n";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; content?: string | string[]; preview?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const language = normalizeLanguage(user.language);
  const en = language === "en";
  const [params, settings] = await Promise.all([searchParams, readOperationalSettings()]);
  const fromValue = clampDateToDataStart(params.from ?? monthStart(), settings.dataStartDate);
  const toValue = clampDateToDataStart(params.to ?? today(), settings.dataStartDate);
  const defaultContents = user.role === "NURSE" ? ["servings", "additions", "menus", "evidence"] : ["servings", "additions", "menus", "evidence", "warehouse"];
  const requestedContents = params.content ? (Array.isArray(params.content) ? params.content : [params.content]) : defaultContents;
  const parsedContents = requestedContents.map(parseReportContent);
  const selectedContents = parsedContents.includes("full") ? defaultContents.map(parseReportContent) : parsedContents.filter((item) => item !== "full");
  const rawPreview = params.preview === "1" && selectedContents.length ? await readReportBundle(selectedContents, parseReportRange(fromValue, toValue < fromValue ? fromValue : toValue), user) : null;
  const preview = rawPreview ? localizeReportData(rawPreview, language) : null;
  const sections = preview?.sections ?? (preview ? [{ title: preview.title, columns: preview.columns, rows: preview.rows }] : []);
  const rowCount = sections.reduce((sum, section) => sum + section.rows.length, 0);
  const navigation: ReportNavigationItem[] = en ? [{ id: "report-bao-suat-theo-khoa", content: "servings", title: "Meal counts by department", description: "Daily overview and breakdown by department and code" }, { id: "report-suat-bo-sung", content: "additions", title: "Post-cutoff additions", description: "Includes the shopping list when meal counts are also selected" }, { id: "report-thuc-don-va-dinh-duong", content: "menus", title: "Menus & nutrition", description: "Dishes, foods, energy, recommendations, and assessment" }, { id: "report-bang-chung-bep", content: "evidence", title: "Kitchen evidence", description: "Photo type, notes, saved by, and timestamp" }, ...(user.role !== "NURSE" ? [{ id: "report-nhap-xuat-va-dieu-chinh-kho", content: "warehouse", title: "Inventory data", description: "Receipts, issues, adjustments, and recorded units" }] : [])] : [{ id: "report-bao-suat-theo-khoa", content: "servings", title: "Báo suất theo khoa", description: "Kèm tổng quan ngày và cơ cấu khoa, mã" }, { id: "report-suat-bo-sung", content: "additions", title: "Phát sinh sau chốt", description: "Kèm bảng đi chợ khi chọn cùng báo suất" }, { id: "report-thuc-don-va-dinh-duong", content: "menus", title: "Thực đơn & dinh dưỡng", description: "Món, thực phẩm, kcal, khuyến nghị và đánh giá" }, { id: "report-bang-chung-bep", content: "evidence", title: "Bằng chứng bếp", description: "Loại ảnh, ghi chú, người lưu và thời điểm" }, ...(user.role !== "NURSE" ? [{ id: "report-nhap-xuat-va-dieu-chinh-kho", content: "warehouse", title: "Dữ liệu kho", description: "Nhập, xuất, điều chỉnh và đơn vị ghi nhận" }] : [])];
  return <AppShell user={user}><main className="workspace report-page report-workbench"><Separator className="page-separator" aria-hidden="true"/>
    <PageHeader eyebrow={en ? "Reporting workspace" : "Bàn làm việc báo cáo"} title={en ? "Preview before exporting the right data" : "Xem trước rồi xuất đúng dữ liệu"} description={en ? "Choose the scope once; source data stays unchanged and missing cells are not filled automatically." : "Chọn phạm vi một lần; hệ thống giữ nguyên dữ liệu gốc và không tự điền ô thiếu."} actions={<p className="scope-note">{user.role === "NURSE" ? (en ? "Assigned departments" : "Theo khoa được phân công") : (en ? "Hospital-wide scope" : "Phạm vi toàn viện")}</p>}/>
    <form id="report-scope-form" action="/bao-cao/xuat" method="get" target="_blank" className="report-scope-bar">
      <div><span>{en ? "Report scope" : "Phạm vi báo cáo"}</span><strong>{user.role === "NURSE" ? (en ? "Assigned departments" : "Khoa được phân công") : (en ? "Hospital-wide" : "Toàn viện")}</strong></div>
      <label><span>{en ? "From" : "Từ ngày"}</span><input type="date" name="from" min={settings.dataStartDate} defaultValue={fromValue} required/></label>
      <label><span>{en ? "To" : "Đến ngày"}</span><input type="date" name="to" min={settings.dataStartDate} defaultValue={toValue < fromValue ? fromValue : toValue} required/></label>
      <div className="report-selection-summary"><span>{en ? "Report contents" : "Nội dung báo cáo"}</span><strong>{en ? "Select on the left" : "Tích chọn bên trái"}</strong></div>
      <button className="secondary-button" type="submit" name="preview" value="1" formTarget="_self" formAction="/bao-cao">{en ? "Preview" : "Xem trước"}</button>
      <button className="primary-action" type="submit" name="format" value="excel"><FileSpreadsheet aria-hidden="true"/>{en ? "Export Excel" : "Xuất Excel"}</button>
      <button className="secondary-button" type="submit" name="format" value="pdf"><FileDown aria-hidden="true"/>PDF</button>
      <button className="report-print-action" type="submit" name="format" value="print"><Printer aria-hidden="true"/><span>{en ? "Print" : "In"}</span></button>
    </form>
    <div className="report-work-grid"><aside className="report-content-panel" aria-labelledby="report-builder-title"><header><span><ShieldCheck aria-hidden="true"/></span><div><h2 id="report-builder-title">{en ? "Export contents" : "Nội dung sẽ xuất"}</h2><p>{en ? "The complete set preselects the data needed for reconciliation." : "Bộ đầy đủ đã chọn sẵn các dữ liệu cần đối chiếu."}</p></div></header>
      <ReportNavigation items={navigation} selected={selectedContents} language={language}/>
      <p className="report-footnote">{en ? "Missing data is always shown as “—”, never converted to zero. Maximum export range: 367 days." : "Thiếu dữ liệu luôn hiển thị “—”, không tự chuyển thành 0. Khoảng xuất tối đa 367 ngày."}</p>
    </aside><section className="report-preview-panel" aria-labelledby="report-preview-title">{preview ? <><header className="report-preview-head"><div><span>{en ? "Report preview" : "Xem trước báo cáo"}</span><h2 id="report-preview-title">{preview.title}</h2><p>{preview.scope} · {preview.from} {en ? "to" : "đến"} {preview.to}</p></div><dl><div><dt>{en ? "Data groups" : "Nhóm dữ liệu"}</dt><dd>{sections.length}</dd></div><div><dt>{en ? "Total rows" : "Tổng dòng"}</dt><dd>{rowCount || "—"}</dd></div><div><dt>{en ? "Warnings" : "Cảnh báo"}</dt><dd>{rowCount ? "—" : (en ? "No data" : "Thiếu dữ liệu")}</dd></div></dl></header><ReportPreview sections={sections} language={language}/></> : <div className="split-placeholder"><FileDown aria-hidden="true"/><h2 id="report-preview-title">{en ? "Review before export" : "Kiểm tra trước khi xuất"}</h2><p>{en ? "Choose a date range and select Preview. The system separates each data group for a quick review before download." : "Chọn khoảng ngày rồi bấm “Xem trước”. Hệ thống sẽ tách từng nhóm dữ liệu để bạn rà nhanh trước khi tải file."}</p><span>{en ? `Default: meal counts + additions${user.role !== "NURSE" ? " + inventory data" : ""}` : `Bộ mặc định: báo suất + phát sinh${user.role !== "NURSE" ? " + dữ liệu kho" : ""}`}</span></div>}</section></div>
  </main></AppShell>;
}
