import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { isBeforeCutoff, readNurseServingDay } from "@/lib/serving-report";
import { lockExpiredMealEvent, servingTotal } from "@/lib/late-addition";
import { addLateMealAction, saveServingReportAction } from "./actions";

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function ServingReportPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "NURSE") redirect("/");
  const { saved } = await searchParams;
  let data = await readNurseServingDay(user.id);
  const locked = (await Promise.all(data.events.map((event) => lockExpiredMealEvent(event.id, user)))).some((count) => count > 0);
  if (locked) data = await readNurseServingDay(user.id);
  return <AppShell user={user}><main className="workspace serving-page">
    <header className="page-heading"><div><p className="eyebrow">Báo suất hôm nay</p><h1>{data.departmentName}</h1></div><p className="scope-note">{dateLabel.format(new Date())} · Khoa được gán tự động</p></header>
    {saved && <p className="success-banner" role="status">{saved === "addition" ? "Đã gửi suất bổ sung riêng cho bếp. Số suất gốc không thay đổi." : "Đã lưu báo suất và cập nhật tổng toàn viện."}</p>}
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
            {event.dietMeals.map((meal) => { const line = byDiet.get(meal.dietTypeId); const additions = event.additions.filter((item) => item.dietTypeId === meal.dietTypeId); const total = servingTotal(line?.quantity ?? 0, additions); return <tr key={meal.id}>
              <td><input type="hidden" name="dietTypeId" value={meal.dietTypeId}/><strong>{meal.dietType.name}</strong><span>{meal.dietType.code} · {meal.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"}</span></td>
              <td><input className="quantity-input tabular" aria-label={`Số suất ${meal.dietType.name}`} name={`quantity:${meal.dietTypeId}`} type="number" min="0" step="1" required disabled={!editable} defaultValue={line?.quantity ?? ""} placeholder="—"/>{!editable && <span className="serving-total">Gốc {line?.quantity ?? "—"} + bổ sung {total.additions || "—"} = {line ? total.total : "—"}</span>}</td>
              <td><textarea aria-label={`Ghi chú nội bộ ${meal.dietType.name}`} name={`internalNote:${meal.dietTypeId}`} maxLength={500} disabled={!editable} defaultValue={line?.internalNote ?? ""} placeholder="Chỉ nhân viên thấy"/></td>
              <td><textarea aria-label={`Ghi chú bệnh nhân thấy ${meal.dietType.name}`} name={`patientVisibleNote:${meal.dietTypeId}`} maxLength={500} disabled={!editable} defaultValue={line?.patientVisibleNote ?? ""} placeholder="Có thể công khai qua QR"/></td>
            </tr>; })}
          </tbody></table></div>
          <footer className="serving-actions"><p>{editable ? "Có thể sửa và lưu lại trước giờ chốt. Mỗi lần lưu đều được truy vết." : "Số suất gốc đã khóa. Mọi phát sinh được ghi thành bản bổ sung riêng."}</p><button className="primary-action" disabled={!editable}>Lưu báo suất</button></footer>
        </form>}
        {!editable && event.dietMeals.length > 0 && <div className="late-addition-area"><form className="late-addition-form" action={addLateMealAction}><input type="hidden" name="mealEventId" value={event.id}/><label>Chế độ ăn<select name="dietTypeId" required>{event.dietMeals.map((meal) => <option key={meal.id} value={meal.dietTypeId}>{meal.dietType.name}</option>)}</select></label><label>Số bổ sung<input name="quantity" type="number" min="1" step="1" required/></label><label className="reason-field">Lý do bắt buộc<input name="reason" maxLength={500} required placeholder="Ví dụ: người bệnh mới nhập viện"/></label><button className="primary-action">Báo bổ sung</button></form>{event.additions.length > 0 && <div className="late-history"><strong>Bổ sung đã gửi</strong>{event.additions.map((item) => <span key={item.id}>+{item.quantity} {item.dietType.name} · {item.kind === "URGENT_POST_SERVE" ? "Khẩn sau phục vụ" : "Sau chốt"} · {item.ackStatus === "PENDING" ? "Bếp chưa xác nhận" : item.ackStatus === "RECEIVED" ? "Đã nhận" : item.ackStatus === "INSUFFICIENT" ? "Không đủ" : "Cần thay thế"}</span>)}</div>}</div>}
      </section>;
    })}</div>
  </main></AppShell>;
}
