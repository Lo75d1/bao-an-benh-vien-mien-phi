/* eslint-disable @next/next/no-img-element -- evidence URL comes from the configured storage boundary */
import { notFound } from "next/navigation";
import { ImageOff } from "lucide-react";
import { DietName, EvaluationBadge, StatusBadge } from "@/components/presentation";
import { readPublicDepartment } from "@/lib/patient-note";
import { submitPatientNoteAction } from "./actions";

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit" });
const overallStatus = { OK: "OK", WARN: "LOW", FAIL: "HIGH", MISSING: "MISSING" } as const;

export default async function PatientPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ note?: string }> }) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const data = await readPublicDepartment(token);
  if (!data) notFound();
  const action = submitPatientNoteAction.bind(null, token);
  return <main className="patient-page">
    <header className="patient-header"><p className="eyebrow">Suất ăn bệnh viện</p><h1>{data.department.name}</h1><p>Thông tin bữa ăn theo khoa, không chứa hồ sơ người bệnh.</p></header>
    <section className="patient-section" aria-labelledby="current-meal">
      <div className="patient-section-heading"><div><p className="eyebrow">Bữa gần nhất</p><h2 id="current-meal">{data.current ? `${data.current.mealType.name} · ${data.current.mealType.serviceTime}` : "—"}</h2></div>{data.current && <span className="patient-date">{dateLabel.format(data.current.mealDate)}</span>}</div>
      {!data.current ? <div className="patient-empty" role="status"><strong>—</strong><p>Chưa có dữ liệu bữa ăn đã báo cho khoa.</p></div> : <div className="public-diet-list">{data.current.dietMeals.map((meal) => <article className="public-diet" key={meal.id}>
        {meal.evidence[0]?.publicUrl ? <img src={meal.evidence[0].publicUrl} alt={`Ảnh bữa ăn ${meal.dietType.name}`}/> : <div className="patient-photo-empty"><ImageOff aria-hidden="true"/><strong>—</strong><span>Chưa có ảnh bữa ăn</span></div>}
        <div className="public-diet-body"><div className="public-diet-title"><div><h3><DietName name={meal.dietType.name} code={meal.dietType.code}/></h3></div><StatusBadge status={meal.status}/></div>
          <div className="patient-menu"><span>Thực đơn</span><strong>{meal.menuItems.length ? meal.menuItems.join(" · ") : "—"}</strong>{meal.menuItems.length === 0 && <small>Chưa có dữ liệu thực đơn.</small>}</div>
          <details className="patient-evaluation"><summary><span>Mức chỉ tiêu</span><EvaluationBadge status={overallStatus[meal.evaluation.overall]}/></summary>{meal.evaluation.criteria.length ? <ul>{meal.evaluation.criteria.map((criterion) => <li key={criterion.key}><span>{criterion.label}</span><EvaluationBadge status={criterion.status as "OK" | "LOW" | "HIGH" | "MISSING"}/></li>)}</ul> : <p>— · Chưa đủ dữ liệu đánh giá.</p>}</details>
          {meal.patientVisibleNotes.length > 0 && <div className="patient-visible-note"><span>Thông tin từ khoa</span>{meal.patientVisibleNotes.map((note, index) => <p key={index}>{note}</p>)}</div>}
        </div>
      </article>)}</div>}
    </section>
    <section className="patient-next" aria-labelledby="next-meal"><p className="eyebrow">Bữa tiếp theo</p><h2 id="next-meal">{data.next ? `${data.next.mealType.name} · ${data.next.mealType.serviceTime}` : "—"}</h2><p>{data.next ? dateLabel.format(data.next.mealDate) : "Chưa có dữ liệu bữa tiếp theo."}</p></section>
    <section className="patient-note-form" id="gui-ghi-chu" aria-labelledby="note-heading"><p className="eyebrow">Gửi cho khoa</p><h2 id="note-heading">Góp ý về bữa ăn</h2><p>Ghi chú sẽ chờ điều dưỡng duyệt trước khi chuyển tới bếp. Không gửi thông tin bệnh án hoặc dữ liệu nhạy cảm.</p>
      {query.note === "sent" && <p className="patient-form-success" role="status">Đã gửi ghi chú. Điều dưỡng sẽ xem xét trước khi chuyển tới bếp.</p>}
      {query.note && query.note !== "sent" && <p className="patient-form-error" role="alert">{query.note === "limited" ? "Bạn đã gửi quá nhiều ghi chú. Vui lòng thử lại sau." : query.note === "invalid" ? "Ghi chú cần từ 3 đến 500 ký tự." : "Chưa thể gửi ghi chú lúc này. Vui lòng thử lại sau."}</p>}
      <form action={action}><label htmlFor="patient-note">Ghi chú <span>bắt buộc</span></label><textarea id="patient-note" name="note" minLength={3} maxLength={500} required placeholder="Ví dụ: Món canh hôm nay hơi mặn"/><label htmlFor="contact-name">Tên để khoa tiện trao đổi <span>không bắt buộc</span></label><input id="contact-name" name="contactName" maxLength={100} autoComplete="off"/><button type="submit">Gửi ghi chú</button></form>
    </section>
    <footer className="patient-footer">Thông tin theo khoa · Không thay thế tư vấn y tế</footer>
  </main>;
}
