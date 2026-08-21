import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/presentation";
import { FileDown } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  return <AppShell user={user}><main className="workspace report-page">
    <PageHeader eyebrow="Báo cáo" title="Một trình xuất thống nhất" description="Chọn khoảng ngày, nội dung và định dạng trong một luồng." actions={<p className="scope-note">{user.role === "NURSE" ? "Dữ liệu tự giới hạn theo khoa được phân công" : "Phạm vi toàn viện"}</p>}/>
    <section className="report-builder" aria-labelledby="report-builder-title">
      <div className="report-builder-copy"><span><FileDown aria-hidden="true"/></span><div><h2 id="report-builder-title">Chọn một lần, nhận đúng nội dung</h2><p>Dữ liệu được đọc trực tiếp từ hệ thống tại thời điểm xuất. Ô thiếu hiển thị “—”, không suy đoán.</p></div></div>
      <form action="/bao-cao/xuat" method="get" target="_blank" className="report-flow">
        <label><span>1 · Từ ngày</span><input type="date" name="from" defaultValue={monthStart()} required/></label>
        <label><span>2 · Đến ngày</span><input type="date" name="to" defaultValue={today()} required/></label>
        <label><span>3 · Chọn nội dung</span><select name="content" required><option value="servings">Báo suất theo khoa</option><option value="additions">Suất bổ sung</option>{user.role !== "NURSE" && <option value="warehouse">Nhập, xuất và điều chỉnh kho</option>}</select></label>
        <label><span>4 · Định dạng</span><select name="format" required><option value="excel">Excel (.xlsx)</option><option value="pdf">PDF</option><option value="print">In</option></select></label>
        <button className="primary-action" type="submit">Xuất báo cáo</button>
      </form>
      <p className="report-footnote">Khoảng xuất tối đa 367 ngày. Báo suất gốc và suất bổ sung luôn nằm ở hai nội dung riêng để không làm sai lịch sử.</p>
    </section>
  </main></AppShell>;
}
