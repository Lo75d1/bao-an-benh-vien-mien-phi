/* eslint-disable @next/next/no-img-element -- evidence URL comes from the configured storage boundary */
import { ImageOff } from "lucide-react";
import { notFound } from "next/navigation";
import { DietName, EvaluationBadge, StatusBadge } from "@/components/presentation";
import { readPublicDepartment } from "@/lib/patient-note";
import { submitPatientNoteAction } from "./actions";

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit" });
const overallStatus = { OK: "OK", WARN: "LOW", FAIL: "HIGH", MISSING: "MISSING" } as const;

export default async function PatientPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ note?: string; date?: string }> }) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const data = await readPublicDepartment(token, query.date);
  if (!data) notFound();
  const action = submitPatientNoteAction.bind(null, token);

  return <main className="patient-page" id="noi-dung-chinh">
    <header className="patient-header"><p className="eyebrow">Thực đơn bệnh nhân</p><h1 className="text-balance">{data.department.name}</h1><p>Thông tin theo khoa, không chứa hồ sơ người bệnh.</p></header>

    <form method="get" className="patient-date-picker"><label htmlFor="patient-menu-date">Ngày muốn xem</label><div><input id="patient-menu-date" name="date" type="date" min={data.minDate} max={data.maxDate} defaultValue={data.selectedDate}/><button type="submit">Xem thực đơn</button></div><small>Có thể xem từ hôm nay đến trước tối đa {data.advanceEntryDays} ngày.</small></form>

    <section className="patient-now-next" aria-label="Suất ăn hiện tại và suất kế tiếp">
      <article><span>Suất hiện tại</span>{data.current ? <><strong>{data.current.mealType.name} · {data.current.mealType.serviceTime}</strong><small>{data.current.dietMeals.length ? `${data.current.dietMeals.length} mã chế độ ăn` : "— · Chưa có thực đơn"}</small></> : <><strong>—</strong><small>Chưa đến suất đầu tiên trong ngày.</small></>}</article>
      <article><span>Suất kế tiếp</span>{data.next ? <><strong>{data.next.mealType.name} · {data.next.mealType.serviceTime}</strong><small>{dateLabel.format(data.next.mealDate)} · {data.next.dietMeals.length ? `${data.next.dietMeals.length} mã chế độ ăn` : "Chưa có thực đơn"}</small></> : <><strong>—</strong><small>Chưa có suất kế tiếp trong cửa sổ công khai.</small></>}</article>
    </section>

    <section className="patient-section" aria-labelledby="selected-menu"><div className="patient-section-heading"><div><p className="eyebrow">Thực đơn trong ngày</p><h2 id="selected-menu">{dateLabel.format(new Date(`${data.selectedDate}T00:00:00.000Z`))}</h2></div></div>
      {!data.selectedEvents.length ? <div className="patient-empty" role="status"><strong>—</strong><p>Khoa chưa có thực đơn được xác nhận cho ngày này.</p></div> : <div className="patient-day-meals">{data.selectedEvents.map((event) => <section className="patient-meal-block" key={event.id}><header><strong>{event.mealType.name}</strong><span>{event.mealType.serviceTime}</span></header><div className="public-diet-list">{event.dietMeals.map((meal) => <article className="public-diet" key={meal.id}>
        {data.showImages ? meal.evidence[0]?.publicUrl ? <img src={meal.evidence[0].publicUrl} alt={`Ảnh bữa ăn ${meal.dietType.name}`} width={1200} height={900}/> : <div className="patient-photo-empty" role="img" aria-label={`Chưa có ảnh bữa ăn ${meal.dietType.name}`}><ImageOff aria-hidden="true"/><strong>—</strong><span>Chưa có ảnh bữa ăn</span></div> : null}
        <div className="public-diet-body"><div className="public-diet-title"><h3><DietName name={meal.dietType.name} code={meal.dietType.code}/></h3><StatusBadge status={meal.status}/></div>
          <div className="patient-menu"><span>Thực đơn</span><strong>{meal.menuItems.length ? meal.menuItems.join(" · ") : "—"}</strong>{meal.menuItems.length === 0 && <small>Chưa có dữ liệu thực đơn.</small>}</div>
          <details className="patient-evaluation"><summary><span>Mức chỉ tiêu</span><EvaluationBadge status={overallStatus[meal.evaluation.overall]}/></summary>{meal.evaluation.criteria.length ? <ul>{meal.evaluation.criteria.map((criterion) => <li key={criterion.key}><span>{criterion.label}</span><EvaluationBadge status={criterion.status as "OK" | "LOW" | "HIGH" | "MISSING"}/></li>)}</ul> : <p>— · Chưa đủ dữ liệu đánh giá.</p>}</details>
          {meal.patientVisibleNotes.length > 0 && <div className="patient-visible-note">{meal.patientVisibleNotes.map((note, index) => <section key={`${note.source}-${index}`}><span>{note.source === "DIETITIAN" ? "Ghi chú từ dinh dưỡng" : "Thông tin từ khoa"}</span><p>{note.text}</p></section>)}</div>}
        </div>
      </article>)}</div></section>)}</div>}
    </section>

    <section className="patient-note-form" id="gui-ghi-chu" aria-labelledby="note-heading"><p className="eyebrow">Gửi cho khoa / quản trị</p><h2 id="note-heading">Gửi ghi chú / phản ánh</h2><p>Nội dung này sẽ được gửi đến Khoa điều trị và Quản trị hệ thống. Ghi chú bữa ăn chỉ chuyển tới Bếp sau khi Khoa hoặc Admin kiểm tra.</p>
      {query.note === "sent" && <p className="patient-form-success" role="status" aria-live="polite">Đã gửi nội dung. Khoa điều trị và Quản trị hệ thống sẽ xem xét.</p>}
      {query.note && query.note !== "sent" && <p className="patient-form-error" role="alert">{query.note === "limited" ? "Bạn đã gửi quá nhiều nội dung. Vui lòng thử lại sau." : query.note === "invalid" ? "Nội dung cần từ 3 đến 500 ký tự." : "Chưa thể gửi nội dung lúc này. Vui lòng thử lại sau."}</p>}
      <form action={action}>
        <input type="hidden" name="mealDate" value={data.selectedDate}/>
        <fieldset className="patient-submission-type"><legend>Chọn loại nội dung</legend><label><input type="radio" name="type" value="MEAL_NOTE" defaultChecked/>Ghi chú bữa ăn</label><label><input type="radio" name="type" value="FEEDBACK"/>Phản ánh</label></fieldset>
        <label htmlFor="patient-note">Nội dung <span>bắt buộc</span></label><textarea id="patient-note" name="note" minLength={3} maxLength={500} required placeholder="Ví dụ: Món canh hôm nay hơi mặn hoặc cần phản ánh về bữa ăn…"/>
        <label htmlFor="contact-name">Tên người gửi <span>không bắt buộc</span></label><input id="contact-name" name="contactName" maxLength={100} autoComplete="name"/>
        <label htmlFor="contact-info">Thông tin liên hệ <span>không bắt buộc</span></label><input id="contact-info" name="contactInfo" maxLength={120} autoComplete="tel" placeholder="Số điện thoại hoặc buồng/phòng nếu muốn khoa phản hồi"/>
        <button type="submit">Gửi nội dung</button>
      </form>
    </section>
    <footer className="patient-footer">Thông tin theo khoa · Không thay thế tư vấn y tế</footer>
  </main>;
}
