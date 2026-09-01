"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";
import type { ManagementCriterion, ManagementSchedule, ManagementScheduleDiet, ManagementSchedulePhase, ManagementScheduleRoute, ManagementStatus } from "@/lib/management";

const numberFormat = new Intl.NumberFormat("vi-VN");
const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

function Missing({ children }: { children: React.ReactNode }) {
  return <p className="schedule-missing">— · {children}</p>;
}

function DietDetail({ diet, serviceLabel }: { diet: ManagementScheduleDiet; serviceLabel: string }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management;
  const hasNotice = diet.notes.length > 0 || diet.lateAdditions.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="schedule-diet-button" aria-label={t.scheduleDietView.replace("{code}", diet.code).replace("{count}", diet.servings === null ? t.scheduleNoServings : `${diet.servings} ${t.incidentQuantity}`)}>
          <span className="schedule-diet-code" translate="no">
            {diet.code}
            {hasNotice ? <span className="note-marker" title={t.scheduleHasNote} aria-label={t.scheduleHasNote} /> : null}
          </span>
          <span className="schedule-diet-count">{diet.servings === null ? "—" : numberFormat.format(diet.servings)}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="schedule-dialog max-h-[88vh] max-w-3xl overflow-y-auto overscroll-contain p-4">
        <DialogHeader className="pr-8">
          <DialogTitle>
            <span translate="no">{diet.code}</span> · {diet.name}
          </DialogTitle>
          <DialogDescription>
            {serviceLabel} · {t.scheduleReadonly}
          </DialogDescription>
        </DialogHeader>
        <dl className="schedule-dialog-summary">
          <div>
            <dt>{t.scheduleMealsTotal}</dt>
            <dd>{diet.servings === null ? "—" : `${numberFormat.format(diet.servings)} ${t.incidentQuantity}`}</dd>
          </div>
          <div>
            <dt>{t.scheduleStatus}</dt>
            <dd>
              <span className={`kitchen-state kitchen-${diet.status.toLowerCase()}`}>{STATUS_LABEL[diet.status]}</span>
            </dd>
          </div>
        </dl>
        <div className="schedule-dialog-columns">
          <section>
            <h3>{t.scheduleMenu}</h3>
            {diet.menuItems.length > 0 ? (
              <table className="schedule-detail-table">
                <thead>
                  <tr>
                    <th scope="col">{t.scheduleMenuItem}</th>
                    <th scope="col">{t.schedulePortion}</th>
                  </tr>
                </thead>
                <tbody>
                  {diet.menuItems.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td>{item.name}</td>
                      <td>{item.grams === null ? "—" : `${numberFormat.format(item.grams)} g`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Missing>{t.scheduleNoMenuSnapshot}</Missing>
            )}
          </section>
          <section>
            <h3>{t.scheduleEvaluation}</h3>
            {diet.criteria.length > 0 ? (
              <div className="schedule-criteria">
                {diet.criteria.map((criterion) => (
                  <div className={`criterion criterion-${criterion.status.toLowerCase()}`} key={criterion.key}>
                    <span>{criterion.label}</span>
                    <strong>{CRITERION_LABEL[criterion.status]}</strong>
                    <small>
                      {criterion.actual === null ? "—" : `${numberFormat.format(criterion.actual)}${criterion.unit ? ` ${criterion.unit}` : ""}`} / {criterion.target}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <Missing>{t.scheduleNoEvaluation}</Missing>
            )}
          </section>
        </div>
        <section>
          <h3>{t.scheduleKitchen}</h3>
          <dl className="schedule-checks">
            <div>
              <dt>{t.scheduleMealPhoto}</dt>
              <dd>{diet.evidence.mealPhoto ? t.scheduleCaptured : "—"}</dd>
            </div>
            <div>
              <dt>{t.scheduleStoredSample}</dt>
              <dd>{diet.evidence.foodSample ? t.scheduleSaved : "—"}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3>{t.scheduleRelatedNotes}</h3>
          {diet.notes.length > 0 ? (
            <ul className="schedule-note-list">
              {diet.notes.map((note, index) => (
                <li key={`${note.source}-${index}`}>
                  <span>{NOTE_LABEL[note.source]}</span>
                  <div>
                    {note.department ? <b>{note.department} · </b> : null}
                    {note.text}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Missing>{t.scheduleNoNotes}</Missing>
          )}
        </section>
        <section>
          <h3>{t.scheduleLateAdditions}</h3>
          {diet.lateAdditions.length > 0 ? (
            <ul className="schedule-plain-list">
              {diet.lateAdditions.map((item) => (
                <li key={item.id}>
                  <strong>
                    +{numberFormat.format(item.quantity)} {t.incidentQuantity}
                  </strong>
                  <span>
                    {item.department} · {item.reason}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Missing>{t.scheduleNoLateAdditions}</Missing>
          )}
        </section>
        <section>
          <h3>{t.scheduleRelatedInventory}</h3>
          {diet.inventory.length > 0 ? (
            <ul className="schedule-plain-list">
              {diet.inventory.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.warehouse} · {item.type}
                  </strong>
                  <span>
                    {dateTimeFormat.format(new Date(item.occurredAt))}
                    {item.note ? ` · ${item.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Missing>{t.scheduleNoInventory}</Missing>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_LABEL: Record<ManagementStatus, string> = {
  PLANNED: "Bếp chưa bắt đầu",
  LOCKED: "Bếp chưa bắt đầu",
  PREPARING: "Bếp đang làm",
  PREPARED: "Bếp đã xác nhận chuẩn bị xong",
  SERVED: "Bếp đã xác nhận giao",
};

const CRITERION_LABEL: Record<ManagementCriterion["status"], string> = {
  OK: "Đạt",
  LOW: "Thiếu",
  HIGH: "Vượt",
  MISSING: "—",
};

const NOTE_LABEL = { MENU: "Thực đơn", SERVING: "Báo suất", PATIENT: "Người bệnh" } as const;
const PHASE_LABEL: Record<ManagementSchedulePhase, string> = {
  REPORTING: "Đang nhận báo",
  PREPARATION: "Giai đoạn chuẩn bị",
  SERVICE: "Đang phục vụ",
  CLOSED: "Đã đóng",
};

function routeTitle(route: ManagementScheduleRoute, t: ReturnType<typeof getTranslations>["management"]) {
  return route === "NORMAL" ? t.scheduleRouteNormal : t.scheduleRouteSonde;
}

export function ScheduleBoard({ data }: { data: ManagementSchedule }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management;
  const centerDate = data.days[1]?.date ?? "";

  return (
    <section className="schedule-board" aria-labelledby="schedule-heading">
      <div className="schedule-heading">
        <div>
          <p className="eyebrow">{t.scheduleEyebrow}</p>
          <h2 id="schedule-heading">{t.scheduleTitle}</h2>
        </div>
        <div className="schedule-heading-tools">
          <div className="schedule-legend" aria-label={t.scheduleLegend}>
            {Object.entries(PHASE_LABEL).map(([phase, label]) => (
              <span key={phase} className={`phase-key phase-${phase.toLowerCase()}`}>
                <i aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
          <form method="get" action="/quan-ly">
            <label htmlFor="schedule-date">{t.scheduleChooseDate}</label>
            <input id="schedule-date" name="ngay" type="date" defaultValue={centerDate} autoComplete="off" />
            <button type="submit">{t.scheduleView}</button>
            <Link href="/quan-ly#schedule-heading">{t.scheduleCurrent}</Link>
          </form>
        </div>
      </div>
      {ROUTES.map((route) => (
        <section className={`schedule-route route-${route.id.toLowerCase()}`} key={route.id} aria-labelledby={`route-${route.id}`}>
          <header className="schedule-route-header">
            <h3 id={`route-${route.id}`}>{routeTitle(route.id, t)}</h3>
          </header>
          <div className="schedule-grid-wrap">
            <table className="schedule-grid">
              <thead>
                <tr>
                  <th scope="col" className="day-column">
                    {t.scheduleDay}
                  </th>
                  {data.mealTypes.map((mealType) => (
                    <th scope="col" key={mealType.id}>
                      <strong>{mealType.name}</strong>
                      <small>{mealType.serviceTime || "—"}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.days.map((day, dayIndex) => (
                  <tr key={day.date} className={dayIndex === 1 ? "selected-day" : undefined}>
                    <th scope="row">
                      <strong>{day.label}</strong>
                      {day.isToday ? <small>{t.scheduleToday}</small> : null}
                    </th>
                    {data.mealTypes.map((mealType) => {
                      const cell = day.cells[mealType.id];
                      const isFuture = cell ? new Date(`${day.date}T${cell.serviceTime || "23:59"}:00+07:00`).getTime() > new Date(data.generatedAt).getTime() : true;
                      const diets = !isFuture && cell ? cell.diets.filter((diet) => diet.feedingRoute === route.id) : [];
                      return (
                        <td key={mealType.id} className={`schedule-cell ${cell && !isFuture ? `phase-${cell.phase.toLowerCase()}` : "phase-empty"}`}>
                          {cell && !isFuture ? (
                            <div className="cell-phase">
                              <span>{PHASE_LABEL[cell.phase]}</span>
                            </div>
                          ) : null}
                          {diets.length > 0 ? (
                            <div className="schedule-diets">
                              {diets.map((diet) => (
                                <DietDetail key={diet.id} diet={diet} serviceLabel={`${day.label} · ${mealType.name}`} />
                              ))}
                            </div>
                          ) : (
                            <p className="schedule-cell-empty">—</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </section>
  );
}

const ROUTES: Array<{ id: ManagementScheduleRoute; title: string }> = [
  { id: "NORMAL", title: "NORMAL" },
  { id: "SONDE", title: "SONDE" },
];
