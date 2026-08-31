/* eslint-disable @next/next/no-img-element -- evidence URL comes from the configured storage boundary */
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { notFound } from "next/navigation";
import { DietName, EvaluationBadge, StatusBadge } from "@/components/presentation";
import { publicDateFormatter, publicMealTypeName, publicT, resolvePublicLanguage, type PublicLanguage } from "@/lib/public-i18n";
import { readPublicDepartment } from "@/lib/patient-note";
import { submitPatientNoteAction } from "./actions";

const overallStatus = { OK: "OK", WARN: "LOW", FAIL: "HIGH", MISSING: "MISSING" } as const;

function languageHref(token: string, date: string | undefined, language: PublicLanguage) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  params.set("lang", language);
  return `/k/${encodeURIComponent(token)}?${params.toString()}`;
}

export default async function PatientPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ note?: string; date?: string; lang?: string }> }) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const language = resolvePublicLanguage(query.lang);
  const t = (key: Parameters<typeof publicT>[1], vars?: Record<string, string | number>) => publicT(language, key, vars);
  const dateLabel = publicDateFormatter(language);
  const data = await readPublicDepartment(token, query.date);
  if (!data) notFound();
  const action = submitPatientNoteAction.bind(null, token);

  return <main className="patient-page" id="noi-dung-chinh" lang={language}>
    <header className="patient-header">
      <div className="public-language-switch" aria-label={t("languageLabel")}><Link aria-current={language === "vi" ? "page" : undefined} href={languageHref(token, query.date, "vi")}>VI</Link><Link aria-current={language === "en" ? "page" : undefined} href={languageHref(token, query.date, "en")}>EN</Link></div>
      <p className="eyebrow">{t("publicMenuEyebrow")}</p><h1 className="text-balance">{data.department.name}</h1><p>{language === "en" ? "Ward-based information. No patient medical record is shown." : "Thông tin theo khoa, không chứa hồ sơ người bệnh."}</p>
    </header>

    <form method="get" className="patient-date-picker"><input type="hidden" name="lang" value={language}/><label htmlFor="patient-menu-date">{t("viewDate")}</label><div><input id="patient-menu-date" name="date" type="date" min={data.minDate} max={data.maxDate} defaultValue={data.selectedDate}/><button type="submit">{t("viewMenu")}</button></div><small>{t("advanceWindow", { days: data.advanceEntryDays })}</small></form>

    <section className="patient-now-next" aria-label={`${t("currentMeal")} / ${t("nextMeal")}`}>
      <article><span>{t("currentMeal")}</span>{data.current ? <><strong>{publicMealTypeName(data.current.mealType.name, language)} · {data.current.mealType.serviceTime}</strong><small>{data.current.dietMeals.length ? `${data.current.dietMeals.length} ${language === "en" ? "diet codes" : "mã chế độ ăn"}` : `— · ${t("noMenuTitle")}`}</small></> : <><strong>—</strong><small>{t("noCurrentMeal")}</small></>}</article>
      <article><span>{t("nextMeal")}</span>{data.next ? <><strong>{publicMealTypeName(data.next.mealType.name, language)} · {data.next.mealType.serviceTime}</strong><small>{dateLabel.format(data.next.mealDate)} · {data.next.dietMeals.length ? `${data.next.dietMeals.length} ${language === "en" ? "diet codes" : "mã chế độ ăn"}` : t("noMenuTitle")}</small></> : <><strong>—</strong><small>{t("noNextMeal")}</small></>}</article>
    </section>

    <section className="patient-section" aria-labelledby="selected-menu"><div className="patient-section-heading"><div><p className="eyebrow">{language === "en" ? "Daily menu" : "Thực đơn trong ngày"}</p><h2 id="selected-menu">{dateLabel.format(new Date(`${data.selectedDate}T00:00:00.000Z`))}</h2></div></div>
      {!data.selectedEvents.length ? <div className="patient-empty" role="status"><strong>—</strong><p>{language === "en" ? "This ward has no confirmed menu for the selected date." : "Khoa chưa có thực đơn được xác nhận cho ngày này."}</p></div> : <div className="patient-day-meals">{data.selectedEvents.map((event) => <section className="patient-meal-block" key={event.id}><header><strong>{publicMealTypeName(event.mealType.name, language)}</strong><span>{event.mealType.serviceTime}</span></header><div className="public-diet-list">{event.dietMeals.map((meal) => <article className="public-diet" key={meal.id}>
        {data.showImages ? meal.evidence[0]?.publicUrl ? <img src={meal.evidence[0].publicUrl} alt={`${publicMealTypeName(event.mealType.name, language)} · ${meal.dietType.name}`} width={1200} height={900}/> : <div className="patient-photo-empty" role="img" aria-label={t("noPhoto")}><ImageOff aria-hidden="true"/><strong>—</strong><span>{t("noPhoto")}</span></div> : null}
        <div className="public-diet-body"><div className="public-diet-title"><h3><DietName name={meal.dietType.name} code={meal.dietType.code}/></h3><StatusBadge status={meal.status}/></div>
          <div className="patient-menu"><span>{t("menu")}</span><strong>{meal.menuItems.length ? meal.menuItems.join(" · ") : "—"}</strong>{meal.menuItems.length === 0 && <small>{t("noDishData")}</small>}</div>
          <details className="patient-evaluation"><summary><span>{language === "en" ? "Nutrition target" : "Mức chỉ tiêu"}</span><EvaluationBadge status={overallStatus[meal.evaluation.overall]}/></summary>{meal.evaluation.criteria.length ? <ul>{meal.evaluation.criteria.map((criterion) => <li key={criterion.key}><span>{criterion.label}</span><EvaluationBadge status={criterion.status as "OK" | "LOW" | "HIGH" | "MISSING"}/></li>)}</ul> : <p>— · {language === "en" ? "Not enough evaluation data." : "Chưa đủ dữ liệu đánh giá."}</p>}</details>
          {meal.patientVisibleNotes.length > 0 && <div className="patient-visible-note">{meal.patientVisibleNotes.map((note, index) => <section key={`${note.source}-${index}`}><span>{note.source === "DIETITIAN" ? t("dietitianNote") : language === "en" ? "Ward information" : "Thông tin từ khoa"}</span><p>{note.text}</p></section>)}</div>}
        </div>
      </article>)}</div></section>)}</div>}
    </section>

    <section className="patient-note-form" id="gui-ghi-chu" aria-labelledby="note-heading"><p className="eyebrow">{t("sendToRecipients")}</p><h2 id="note-heading">{t("sendNoteFeedback")}</h2><p>{t("noteFeedbackHelp")}</p>
      {query.note === "sent" && <p className="patient-form-success" role="status" aria-live="polite">{t("submitted")}</p>}
      {query.note && query.note !== "sent" && <p className="patient-form-error" role="alert">{query.note === "limited" ? t("rateLimited") : query.note === "invalid" ? t("invalidNote") : t("submitFailed")}</p>}
      <form action={action}>
        <input type="hidden" name="mealDate" value={data.selectedDate}/><input type="hidden" name="returnDate" value={data.selectedDate}/><input type="hidden" name="returnLang" value={language}/>
        <fieldset className="patient-submission-type"><legend>{t("chooseSubmissionType")}</legend><label><input type="radio" name="type" value="MEAL_NOTE" defaultChecked/>{t("mealNote")}</label><label><input type="radio" name="type" value="FEEDBACK"/>{t("feedback")}</label></fieldset>
        <label htmlFor="patient-note">{t("content")} <span>{t("required")}</span></label><textarea id="patient-note" name="note" minLength={3} maxLength={500} required placeholder={t("notePlaceholder")}/>
        <label htmlFor="contact-name">{t("senderName")} <span>{t("optional")}</span></label><input id="contact-name" name="contactName" maxLength={100} autoComplete="name"/>
        <label htmlFor="contact-info">{t("contactInfo")} <span>{t("optional")}</span></label><input id="contact-info" name="contactInfo" maxLength={120} autoComplete="tel" placeholder={t("contactPlaceholder")}/>
        <button type="submit">{t("submitContent")}</button>
      </form>
    </section>
    <footer className="patient-footer">{language === "en" ? "Ward information · Not a substitute for medical advice" : "Thông tin theo khoa · Không thay thế tư vấn y tế"}</footer>
  </main>;
}
