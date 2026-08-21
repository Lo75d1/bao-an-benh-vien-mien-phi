import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { isBeforeCutoff, readNurseServingDay } from "@/lib/serving-report";
import { saveServingReportAction } from "./actions";

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function ServingReportPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "NURSE") redirect("/");
  const { saved } = await searchParams;
  const data = await readNurseServingDay(user.id);
  return <AppShell user={user}><main className="workspace serving-page">
    <header className="page-heading"><div><p className="eyebrow">Báo suất hôm nay</p><h1>{data.departmentName}</h1></div><p className="scope-note">{dateLabel.format(new Date())} · Khoa được gán tự động</p></header>
    {saved === "1" && <p className="success-banner" role="status">Đã lưu báo suất và cập nhật tổng toàn viện.</p>}
    {data.events.length === 0 && <section className="empty-state"><h2>Chưa có bữa ăn hôm nay</h2><p>Không có số liệu để nhập. Hệ thống không tự tạo hoặc đoán số suất.</p></section>}
    <div className="serving-event-list">{data.events.map((event) => {
      const report = event.reports[0];
      const byDiet = new Map(report?.lines.map((line) => [line.dietTypeId, line]));
      const editable = isBeforeCutoff(event.mealDate, event.mealType.cutoffTime);
      return <section className="serving-event" key={event.id}>
        <div className="serving-event-head"><div><p className="eyebrow">{event.mealType.name}</p><h2>Chốt lúc {event.mealType.cutoffTime}</h2></div><span className={editable ? "cutoff-state open" : "cutoff-state locked"}>{editable ? "Đang nhận báo suất" : "Đã chốt"}</span></div>
        {event.dietMeals.length === 0 ? <div className="serving-empty"><strong>Chưa có chế độ ăn</strong><span>Không thể báo suất cho bữa này.</span></div> : <form action={saveServingReportAction}>
          <input type="hidden" name="mealEventId" value={event.id}/>
          <div className="serving-table-scroll"><table className="serving-table"><thead><tr><th>Chế độ ăn</th><th>Số suất</th><th>Ghi chú nội bộ</th><th>Ghi chú bệnh nhân thấy</th></tr></thead><tbody>
            {event.dietMeals.map((meal) => { const line = byDiet.get(meal.dietTypeId); return <tr key={meal.id}>
              <td><input type="hidden" name="dietTypeId" value={meal.dietTypeId}/><strong>{meal.dietType.name}</strong><span>{meal.dietType.code} · {meal.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"}</span></td>
              <td><input className="quantity-input tabular" aria-label={`Số suất ${meal.dietType.name}`} name={`quantity:${meal.dietTypeId}`} type="number" min="0" step="1" required disabled={!editable} defaultValue={line?.quantity ?? ""} placeholder="—"/></td>
              <td><textarea aria-label={`Ghi chú nội bộ ${meal.dietType.name}`} name={`internalNote:${meal.dietTypeId}`} maxLength={500} disabled={!editable} defaultValue={line?.internalNote ?? ""} placeholder="Chỉ nhân viên thấy"/></td>
              <td><textarea aria-label={`Ghi chú bệnh nhân thấy ${meal.dietType.name}`} name={`patientVisibleNote:${meal.dietTypeId}`} maxLength={500} disabled={!editable} defaultValue={line?.patientVisibleNote ?? ""} placeholder="Có thể công khai qua QR"/></td>
            </tr>; })}
          </tbody></table></div>
          <footer className="serving-actions"><p>{editable ? "Có thể sửa và lưu lại trước giờ chốt. Mỗi lần lưu đều được truy vết." : "Số suất gốc đã khóa. Báo bổ sung được triển khai ở M5."}</p><button className="primary-action" disabled={!editable}>Lưu báo suất</button></footer>
        </form>}
      </section>;
    })}</div>
  </main></AppShell>;
}
