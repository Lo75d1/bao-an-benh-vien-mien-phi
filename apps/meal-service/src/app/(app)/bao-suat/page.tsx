import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader } from "@/components/presentation";
import { Utensils } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { isBeforeCutoff, readNurseServingDay } from "@/lib/serving-report";
import { lockExpiredMealEvent, servingTotal } from "@/lib/late-addition";
import { readPendingPatientNotes } from "@/lib/patient-note";
import { addLateMealAction, reviewPatientNoteAction, saveServingReportAction } from "./actions";
import { ServingForm } from "./serving-form";

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function ServingReportPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "NURSE") redirect("/");
  const { saved } = await searchParams;
  let data = await readNurseServingDay(user.id);
  const pendingNotes = await readPendingPatientNotes(user.id);
  const locked = (await Promise.all(data.events.map((event) => lockExpiredMealEvent(event.id, user)))).some((count) => count > 0);
  if (locked) data = await readNurseServingDay(user.id);
  return <AppShell user={user}><main className="workspace serving-page">
    <PageHeader eyebrow="Báo suất hôm nay" title={data.departmentName} description="Nhập số suất theo chế độ ăn; dữ liệu thiếu luôn hiển thị —." actions={<p className="scope-note">{dateLabel.format(new Date())} · Khoa được gán tự động</p>}/>
    {saved && <p className="success-banner" role="status">{saved === "addition" ? "Đã gửi suất bổ sung riêng cho bếp. Số suất gốc không thay đổi." : "Đã lưu báo suất và cập nhật tổng toàn viện."}</p>}
    {data.events.length === 0 && <EmptyState icon={Utensils} title="Chưa có bữa ăn hôm nay" description="Không có số liệu để nhập. Hệ thống không tự tạo hoặc đoán số suất."/>}
    <section className="patient-note-review" aria-labelledby="pending-note-heading"><div className="section-heading"><div><p className="eyebrow">Ghi chú bệnh nhân</p><h2 id="pending-note-heading">Chờ điều dưỡng duyệt</h2></div><span className="tabular">{pendingNotes.length || "—"} ghi chú</span></div>{pendingNotes.length === 0 ? <p className="review-empty">Không có ghi chú chờ duyệt.</p> : <div className="review-note-list">{pendingNotes.map((note) => <article key={note.id}><div><strong>{note.note}</strong><span>{note.department.name} · {dateLabel.format(note.mealDate)}{note.contactName ? ` · Người gửi tự ghi: ${note.contactName}` : ""}</span></div><form action={reviewPatientNoteAction}><input type="hidden" name="noteId" value={note.id}/><input name="reviewNote" maxLength={100} placeholder="Lý do nếu từ chối"/><button className="secondary-button" name="status" value="REJECTED">Từ chối</button><button className="primary-action" name="status" value="APPROVED">Duyệt tới bếp</button></form></article>)}</div>}</section>
    <div className="serving-event-list">{data.events.map((event) => {
      const report = event.reports[0];
      const byDiet = new Map(report?.lines.map((line) => [line.dietTypeId, line]));
      const editable = isBeforeCutoff(event.mealDate, event.mealType.cutoffTime);
      return <section className="serving-event" key={event.id}>
        <div className="serving-event-head"><div><p className="eyebrow">{event.mealType.name}</p><h2>Chốt lúc {event.mealType.cutoffTime}</h2></div><span className={editable ? "cutoff-state open" : "cutoff-state locked"}>{editable ? "Đang nhận báo suất" : "Đã chốt"}</span></div>
        {event.dietMeals.length === 0 ? <div className="serving-empty"><strong>Chưa có chế độ ăn</strong><span>Không thể báo suất cho bữa này.</span></div> : <ServingForm mealEventId={event.id} editable={editable} action={saveServingReportAction} lines={event.dietMeals.map((meal) => { const line = byDiet.get(meal.dietTypeId); const additions = event.additions.filter((item) => item.dietTypeId === meal.dietTypeId); const total = servingTotal(line?.quantity ?? 0, additions); return { dietTypeId: meal.dietTypeId, name: meal.dietType.name, code: meal.dietType.code, route: meal.feedingRoute, quantity: line ? String(line.quantity) : "", internalNote: line?.internalNote ?? "", patientVisibleNote: line?.patientVisibleNote ?? "", totalLabel: `Gốc ${line?.quantity ?? "—"} + bổ sung ${total.additions || "—"} = ${line ? total.total : "—"}` }; })}/>} {/* Client validation preserves the server action contract. */}
        {!editable && event.dietMeals.length > 0 && <div className="late-addition-area"><form className="late-addition-form" action={addLateMealAction}><input type="hidden" name="mealEventId" value={event.id}/><label>Chế độ ăn<select name="dietTypeId" required>{event.dietMeals.map((meal) => <option key={meal.id} value={meal.dietTypeId}>{meal.dietType.name}</option>)}</select></label><label>Số bổ sung<input name="quantity" type="number" min="1" step="1" required/></label><label className="reason-field">Lý do bắt buộc<input name="reason" maxLength={500} required placeholder="Ví dụ: người bệnh mới nhập viện"/></label><button className="primary-action">Báo bổ sung</button></form>{event.additions.length > 0 && <div className="late-history"><strong>Bổ sung đã gửi</strong>{event.additions.map((item) => <span key={item.id}>+{item.quantity} {item.dietType.name} · {item.kind === "URGENT_POST_SERVE" ? "Khẩn sau phục vụ" : "Sau chốt"} · {item.ackStatus === "PENDING" ? "Bếp chưa xác nhận" : item.ackStatus === "RECEIVED" ? "Đã nhận" : item.ackStatus === "INSUFFICIENT" ? "Không đủ" : "Cần thay thế"}</span>)}</div>}</div>}
      </section>;
    })}</div>
  </main></AppShell>;
}
