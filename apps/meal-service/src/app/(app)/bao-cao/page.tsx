import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/presentation";
import { FileDown } from "lucide-react";
import { parseReportContent, parseReportRange, readReport } from "@/lib/reports";
import { ReportTable } from "./report-table";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; content?: string; preview?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const params = await searchParams;
  const preview = params.preview === "1" && params.from && params.to && params.content ? await readReport(parseReportContent(params.content), parseReportRange(params.from, params.to), user) : null;
  return <AppShell user={user}><main className="workspace report-page">
    <PageHeader eyebrow="Bàn làm việc báo cáo" title="Xem trước rồi xuất đúng dữ liệu" description="Chọn phạm vi một lần; hệ thống giữ nguyên dữ liệu gốc và không tự điền ô thiếu." actions={<p className="scope-note">{user.role === "NURSE" ? "Theo khoa được phân công" : "Phạm vi toàn viện"}</p>}/>
    <section className="report-builder" aria-labelledby="report-builder-title">
      <div className="report-builder-copy"><span><FileDown aria-hidden="true"/></span><div><h2 id="report-builder-title">Thiết lập báo cáo</h2><p>Xem trước ngay trên màn hình hoặc tải Excel, PDF và bản in.</p></div></div>
      <form action="/bao-cao/xuat" method="get" target="_blank" className="report-flow">
        <label><span>1 · Từ ngày</span><input type="date" name="from" defaultValue={monthStart()} required/></label>
        <label><span>2 · Đến ngày</span><input type="date" name="to" defaultValue={today()} required/></label>
        <label><span>3 · Chọn nội dung</span><select name="content" required><option value="servings">Báo suất theo khoa</option><option value="additions">Suất bổ sung</option>{user.role !== "NURSE" && <option value="warehouse">Nhập, xuất và điều chỉnh kho</option>}</select></label>
        <label><span>4 · Định dạng</span><select name="format" required><option value="excel">Excel (.xlsx)</option><option value="pdf">PDF</option><option value="print">In</option></select></label>
        <button className="secondary-button" type="submit" name="preview" value="1" formTarget="_self" formAction="/bao-cao">Xem trước</button><button className="primary-action" type="submit">Xuất báo cáo</button>
      </form>
      <p className="report-footnote">Khoảng xuất tối đa 367 ngày. Báo suất gốc và suất bổ sung luôn nằm ở hai nội dung riêng để không làm sai lịch sử.</p>
    </section>
    {preview && <section className="report-builder" aria-labelledby="report-preview-title"><div className="section-heading"><div><p className="eyebrow">Xem trước</p><h2 id="report-preview-title">{preview.title}</h2></div><span>{preview.scope}</span></div><ReportTable columns={preview.columns} rows={preview.rows}/></section>}
  </main></AppShell>;
}
