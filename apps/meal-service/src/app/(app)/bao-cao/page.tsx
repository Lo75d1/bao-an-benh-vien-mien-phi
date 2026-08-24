import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/presentation";
import { FileDown, FileSpreadsheet, Printer, ShieldCheck } from "lucide-react";
import { parseReportContent, parseReportRange, readReport } from "@/lib/reports";
import { ReportPreview } from "./report-table";
import { ReportNavigation, type ReportNavigationItem } from "./report-navigation";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; content?: string; preview?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const params = await searchParams;
  const preview = params.preview === "1" && params.from && params.to && params.content ? await readReport(parseReportContent(params.content), parseReportRange(params.from, params.to), user) : null;
  const sections = preview?.sections ?? (preview ? [{ title: preview.title, columns: preview.columns, rows: preview.rows }] : []);
  const rowCount = sections.reduce((sum, section) => sum + section.rows.length, 0);
  const navigation: ReportNavigationItem[] = [{ id: "report-tong-quan-theo-ngay", title: "Tổng quan theo ngày", description: "Tổng phục vụ, cơ cấu khoa và mã chế độ" }, { id: "report-bang-di-cho-theo-ngay", title: "Bảng đi chợ theo ngày", description: "Thực phẩm ăn được, thải bỏ và cần mua" }, { id: "report-bao-suat-theo-khoa", title: "Báo suất theo khoa", description: "Suất gốc, người báo, thời gian và trạng thái" }, { id: "report-suat-bo-sung", title: "Phát sinh sau chốt", description: "Số bổ sung, lý do và xác nhận của bếp" }, { id: "report-thuc-don-va-dinh-duong", title: "Thực đơn & dinh dưỡng", description: "Món, thực phẩm, kcal, khuyến nghị và đánh giá" }, { id: "report-bang-chung-bep", title: "Bằng chứng bếp", description: "Loại ảnh, ghi chú, người lưu và thời điểm" }, ...(user.role !== "NURSE" ? [{ id: "report-nhap-xuat-va-dieu-chinh-kho", title: "Dữ liệu kho", description: "Nhập, xuất, điều chỉnh và đơn vị ghi nhận" }] : [])];
  return <AppShell user={user}><main className="workspace report-page report-workbench"><Separator className="page-separator" aria-hidden="true"/>
    <PageHeader eyebrow="Bàn làm việc báo cáo" title="Xem trước rồi xuất đúng dữ liệu" description="Chọn phạm vi một lần; hệ thống giữ nguyên dữ liệu gốc và không tự điền ô thiếu." actions={<p className="scope-note">{user.role === "NURSE" ? "Theo khoa được phân công" : "Phạm vi toàn viện"}</p>}/>
    <form action="/bao-cao/xuat" method="get" target="_blank" className="report-scope-bar">
      <div><span>Phạm vi báo cáo</span><strong>{user.role === "NURSE" ? "Khoa được phân công" : "Toàn viện"}</strong></div>
      <label><span>Từ ngày</span><input type="date" name="from" defaultValue={params.from ?? monthStart()} required/></label>
      <label><span>Đến ngày</span><input type="date" name="to" defaultValue={params.to ?? today()} required/></label>
      <label><span>Bộ báo cáo</span><select name="content" defaultValue={params.content ?? "full"} required><option value="full">Đầy đủ · khuyến nghị</option><option value="servings">Chỉ báo suất theo khoa</option><option value="additions">Chỉ suất bổ sung</option><option value="menus">Chỉ thực đơn & dinh dưỡng</option><option value="evidence">Chỉ bằng chứng bếp</option>{user.role !== "NURSE" && <option value="warehouse">Chỉ dữ liệu kho</option>}</select></label>
      <button className="secondary-button" type="submit" name="preview" value="1" formTarget="_self" formAction="/bao-cao">Xem trước</button>
      <button className="primary-action" type="submit" name="format" value="excel"><FileSpreadsheet aria-hidden="true"/>Xuất Excel</button>
      <button className="secondary-button" type="submit" name="format" value="pdf"><FileDown aria-hidden="true"/>PDF</button>
      <button className="report-print-action" type="submit" name="format" value="print"><Printer aria-hidden="true"/><span>In</span></button>
    </form>
    <div className="report-work-grid"><aside className="report-content-panel" aria-labelledby="report-builder-title"><header><span><ShieldCheck aria-hidden="true"/></span><div><h2 id="report-builder-title">Nội dung sẽ xuất</h2><p>Bộ đầy đủ đã chọn sẵn các dữ liệu cần đối chiếu.</p></div></header>
      <ReportNavigation items={navigation}/>
      <p className="report-footnote">Thiếu dữ liệu luôn hiển thị “—”, không tự chuyển thành 0. Khoảng xuất tối đa 367 ngày.</p>
    </aside><section className="report-preview-panel" aria-labelledby="report-preview-title">{preview ? <><header className="report-preview-head"><div><span>Xem trước báo cáo</span><h2 id="report-preview-title">{preview.title}</h2><p>{preview.scope} · {preview.from} đến {preview.to}</p></div><dl><div><dt>Nhóm dữ liệu</dt><dd>{sections.length}</dd></div><div><dt>Tổng dòng</dt><dd>{rowCount || "—"}</dd></div><div><dt>Cảnh báo</dt><dd>{rowCount ? "—" : "Thiếu dữ liệu"}</dd></div></dl></header><ReportPreview sections={sections}/></> : <div className="split-placeholder"><FileDown aria-hidden="true"/><h2 id="report-preview-title">Kiểm tra trước khi xuất</h2><p>Chọn khoảng ngày rồi bấm “Xem trước”. Hệ thống sẽ tách từng nhóm dữ liệu để bạn rà nhanh trước khi tải file.</p><span>Bộ mặc định: báo suất + phát sinh{user.role !== "NURSE" ? " + dữ liệu kho" : ""}</span></div>}</section></div>
  </main></AppShell>;
}
