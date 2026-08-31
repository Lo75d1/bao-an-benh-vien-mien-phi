"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ManagementCriterion, ManagementSchedule, ManagementScheduleDiet, ManagementSchedulePhase, ManagementScheduleRoute, ManagementStatus } from "@/lib/management";
import type { Language } from "@/lib/i18n";

const numberFormat = new Intl.NumberFormat("vi-VN");
const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const STATUS_LABEL: Record<ManagementStatus, string> = { PLANNED: "Bếp chưa bắt đầu", LOCKED: "Bếp chưa bắt đầu", PREPARING: "Bếp đang làm", PREPARED: "Bếp đã xác nhận chuẩn bị xong", SERVED: "Bếp đã xác nhận giao" };
const CRITERION_LABEL: Record<ManagementCriterion["status"], string> = { OK: "Đạt", LOW: "Thiếu", HIGH: "Vượt", MISSING: "—" };
const NOTE_LABEL = { MENU: "Thực đơn", SERVING: "Báo suất", PATIENT: "Người bệnh" } as const;
const PHASE_LABEL: Record<ManagementSchedulePhase, string> = { REPORTING: "Đang nhận báo", PREPARATION: "Giai đoạn chuẩn bị", SERVICE: "Đang phục vụ", CLOSED: "Đã đóng" };
const ROUTES: Array<{ id: ManagementScheduleRoute; title: string }> = [{ id: "NORMAL", title: "Ăn đường miệng" }, { id: "SONDE", title: "Ăn qua sonde" }];
const TEXT = {
  vi: {
    window: "Ngày được chọn ±1 · Chỉ xem",
    title: "Lịch xuất ăn",
    legend: "Chú giải màu thời gian",
    chooseDate: "Chọn ngày",
    view: "Xem",
    backNow: "Về hiện tại",
    day: "Ngày",
    today: "Hôm nay",
    servingCount: "Số suất toàn viện",
    status: "Trạng thái",
    menu: "Thực đơn",
    meal: "Món",
    quantity: "Định lượng",
    noMenu: "Chưa có snapshot thực đơn.",
    evaluation: "Đánh giá",
    noEvaluation: "Chưa đủ dữ liệu đánh giá.",
    kitchen: "Bếp",
    mealPhoto: "Ảnh bữa ăn",
    savedSample: "Mẫu lưu",
    noValidNote: "Không có ghi chú hợp lệ.",
    lateReport: "Báo trễ",
    noLateReport: "Không có báo trễ.",
    warehouse: "Kho liên quan",
    noWarehouse: "Chưa có giao dịch kho gắn với mã này.",
    noCodeServings: "chưa có số suất",
    hasNotes: "Có ghi chú hoặc báo trễ",
  },
  en: {
    window: "Selected day ±1 · Read only",
    title: "Meal schedule",
    legend: "Time color legend",
    chooseDate: "Choose date",
    view: "View",
    backNow: "Back to current",
    day: "Day",
    today: "Today",
    servingCount: "Hospital servings",
    status: "Status",
    menu: "Menu",
    meal: "Meal",
    quantity: "Quantity",
    noMenu: "No menu snapshot yet.",
    evaluation: "Evaluation",
    noEvaluation: "Not enough evaluation data.",
    kitchen: "Kitchen",
    mealPhoto: "Meal photo",
    savedSample: "Stored sample",
    noValidNote: "No valid notes.",
    lateReport: "Late additions",
    noLateReport: "No late additions.",
    warehouse: "Related inventory",
    noWarehouse: "No inventory transaction linked to this code.",
    noCodeServings: "no servings yet",
    hasNotes: "Has notes or late additions",
  },
} as const;

function Missing({ children }: { children: React.ReactNode }) { return <p className="schedule-missing">— · {children}</p>; }

function DietDetail({ diet, serviceLabel, language = "vi" }: { diet: ManagementScheduleDiet; serviceLabel: string; language?: Language }) {
  const t = TEXT[language];
  const hasNotice = diet.notes.length > 0 || diet.lateAdditions.length > 0;
  return <Dialog><DialogTrigger asChild><button type="button" className="schedule-diet-button" aria-label={`${language === "en" ? "View" : "Xem"} ${diet.code}, ${diet.servings === null ? t.noCodeServings : `${diet.servings} suất`}`}><span className="schedule-diet-code" translate="no">{diet.code}{hasNotice ? <span className="note-marker" title={t.hasNotes} aria-label={t.hasNotes} /> : null}</span><span className="schedule-diet-count">{diet.servings === null ? "—" : numberFormat.format(diet.servings)}</span></button></DialogTrigger><DialogContent className="schedule-dialog max-h-[88vh] max-w-3xl overflow-y-auto overscroll-contain p-4"><DialogHeader className="pr-8"><DialogTitle><span translate="no">{diet.code}</span> · {diet.name}</DialogTitle><DialogDescription>{serviceLabel} · {language === "en" ? "Read only details." : "Chi tiết chỉ đọc."}</DialogDescription></DialogHeader><dl className="schedule-dialog-summary"><div><dt>{t.servingCount}</dt><dd>{diet.servings === null ? "—" : `${numberFormat.format(diet.servings)} suất`}</dd></div><div><dt>{t.status}</dt><dd><span className={`kitchen-state kitchen-${diet.status.toLowerCase()}`}>{STATUS_LABEL[diet.status]}</span></dd></div></dl><div className="schedule-dialog-columns"><section><h3>{t.menu}</h3>{diet.menuItems.length > 0 ? <table className="schedule-detail-table"><thead><tr><th scope="col">{t.meal}</th><th scope="col">{t.quantity}</th></tr></thead><tbody>{diet.menuItems.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.name}</td><td>{item.grams === null ? "—" : `${numberFormat.format(item.grams)} g`}</td></tr>)}</tbody></table> : <Missing>{t.noMenu}</Missing>}</section><section><h3>{t.evaluation}</h3>{diet.criteria.length > 0 ? <div className="schedule-criteria">{diet.criteria.map((criterion) => <div className={`criterion criterion-${criterion.status.toLowerCase()}`} key={criterion.key}><span>{criterion.label}</span><strong>{CRITERION_LABEL[criterion.status]}</strong><small>{criterion.actual === null ? "—" : `${numberFormat.format(criterion.actual)}${criterion.unit ? ` ${criterion.unit}` : ""}`} / {criterion.target}</small></div>)}</div> : <Missing>{t.noEvaluation}</Missing>}</section></div><section><h3>{t.kitchen}</h3><dl className="schedule-checks"><div><dt>{t.mealPhoto}</dt><dd>{diet.evidence.mealPhoto ? (language === "en" ? "Captured" : "Đã chụp") : "—"}</dd></div><div><dt>{t.savedSample}</dt><dd>{diet.evidence.foodSample ? (language === "en" ? "Stored" : "Đã lưu") : "—"}</dd></div></dl></section><section><h3>{language === "en" ? "Related notes" : "Ghi chú liên quan"}</h3>{diet.notes.length > 0 ? <ul className="schedule-note-list">{diet.notes.map((note, index) => <li key={`${note.source}-${index}`}><span>{NOTE_LABEL[note.source]}</span><div>{note.department ? <b>{note.department} · </b> : null}{note.text}</div></li>)}</ul> : <Missing>{t.noValidNote}</Missing>}</section><section><h3>{t.lateReport}</h3>{diet.lateAdditions.length > 0 ? <ul className="schedule-plain-list">{diet.lateAdditions.map((item) => <li key={item.id}><strong>+{numberFormat.format(item.quantity)} suất</strong><span>{item.department} · {item.reason}</span></li>)}</ul> : <Missing>{t.noLateReport}</Missing>}</section><section><h3>{t.warehouse}</h3>{diet.inventory.length > 0 ? <ul className="schedule-plain-list">{diet.inventory.map((item) => <li key={item.id}><strong>{item.warehouse} · {item.type}</strong><span>{dateTimeFormat.format(new Date(item.occurredAt))}{item.note ? ` · ${item.note}` : ""}</span></li>)}</ul> : <Missing>{t.noWarehouse}</Missing>}</section></DialogContent></Dialog>;
}

export function ScheduleBoard({ data, language = "vi" }: { data: ManagementSchedule; language?: Language }) {
  const t = TEXT[language];
  const statusLabel = language === "en"
    ? { PLANNED: "Kitchen not started", LOCKED: "Kitchen not started", PREPARING: "Kitchen working", PREPARED: "Kitchen confirmed ready", SERVED: "Kitchen confirmed served" }
    : STATUS_LABEL;
  const criterionLabel = language === "en"
    ? { OK: "OK", LOW: "Low", HIGH: "High", MISSING: "—" }
    : CRITERION_LABEL;
  const noteLabel = language === "en"
    ? { MENU: "Menu", SERVING: "Serving", PATIENT: "Patient" }
    : NOTE_LABEL;
  const phaseLabel = language === "en"
    ? { REPORTING: "Reporting", PREPARATION: "Preparation", SERVICE: "Serving", CLOSED: "Closed" }
    : PHASE_LABEL;
  const routes = language === "en"
    ? [{ id: "NORMAL" as const, title: "Oral meals" }, { id: "SONDE" as const, title: "Tube feeding" }]
    : ROUTES;
  const centerDate = data.days[1]?.date ?? "";
  return <section className="schedule-board" aria-labelledby="schedule-heading"><div className="schedule-heading"><div><p className="eyebrow">{t.window}</p><h2 id="schedule-heading">{t.title}</h2></div><div className="schedule-heading-tools"><div className="schedule-legend" aria-label={t.legend}>{Object.entries(phaseLabel).map(([phase, label]) => <span key={phase} className={`phase-key phase-${phase.toLowerCase()}`}><i aria-hidden="true" />{label}</span>)}</div><form method="get" action="/quan-ly"><label htmlFor="schedule-date">{t.chooseDate}</label><input id="schedule-date" name="ngay" type="date" defaultValue={centerDate} autoComplete="off" /><button type="submit">{t.view}</button><Link href="/quan-ly#schedule-heading">{t.backNow}</Link></form></div></div>{routes.map((route) => <section className={`schedule-route route-${route.id.toLowerCase()}`} key={route.id} aria-labelledby={`route-${route.id}`}><header className="schedule-route-header"><h3 id={`route-${route.id}`}>{route.title}</h3></header><div className="schedule-grid-wrap"><table className="schedule-grid"><thead><tr><th scope="col" className="day-column">{t.day}</th>{data.mealTypes.map((mealType) => <th scope="col" key={mealType.id}><strong>{mealType.name}</strong><small>{mealType.serviceTime || "—"}</small></th>)}</tr></thead><tbody>{data.days.map((day, dayIndex) => <tr key={day.date} className={dayIndex === 1 ? "selected-day" : undefined}><th scope="row"><strong>{day.label}</strong>{day.isToday ? <small>{t.today}</small> : null}</th>{data.mealTypes.map((mealType) => { const cell = day.cells[mealType.id]; const isFuture = cell ? new Date(`${day.date}T${cell.serviceTime || "23:59"}:00+07:00`).getTime() > new Date(data.generatedAt).getTime() : true; const diets = !isFuture && cell ? cell.diets.filter((diet) => diet.feedingRoute === route.id) : []; return <td key={mealType.id} className={`schedule-cell ${cell && !isFuture ? `phase-${cell.phase.toLowerCase()}` : "phase-empty"}`}>{cell && !isFuture ? <div className="cell-phase"><span>{phaseLabel[cell.phase]}</span></div> : null}{diets.length > 0 ? <div className="schedule-diets">{diets.map((diet) => <DietDetail key={diet.id} diet={diet} serviceLabel={`${day.label} · ${mealType.name}`} language={language} />)}</div> : <p className="schedule-cell-empty">—</p>}</td>; })}</tr>)}</tbody></table></div></section>)}</section>;
}
