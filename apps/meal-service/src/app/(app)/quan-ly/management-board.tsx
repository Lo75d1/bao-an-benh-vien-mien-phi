"use client";

/* eslint-disable @next/next/no-img-element -- ảnh bằng chứng dùng URL từ lớp lưu trữ cấu hình */
import Link from "next/link";
import type { Role } from "@prisma/client";
import { CalendarDays, Check, ChevronRight, ClipboardPlus, Image as ImageIcon, LayoutList, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MealLifecycleStrip } from "@/components/meal-lifecycle-strip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";
import type { ManagementDay, ManagementDiet, ManagementMeal } from "@/lib/management";
import { hospitalDayKey, mealTimePhase, pickLifecycleMeal, rollupMealEventStatus } from "@/lib/meal-events";
import { createAdminAdditionAction } from "./actions";

const number = new Intl.NumberFormat("vi-VN");
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
type ViewMode = "department" | "diet";

function pickCurrentManagementMeal(meals: ManagementMeal[], date: string, now: Date, serviceCompletionMinutes: number) {
  const mealDate = new Date(`${date}T00:00:00.000Z`);
  return pickLifecycleMeal(
    meals.map((meal) => ({
      meal,
      mealDate,
      cutoffTime: meal.cutoffTime,
      serviceTime: meal.serviceTime,
      status: rollupMealEventStatus(meal.diets.map((diet) => diet.status)),
    })),
    now,
    serviceCompletionMinutes,
  )?.meal.meal;
}

function AddIncident({ meal }: { meal: ManagementMeal }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="admin-add-incident">
          <ClipboardPlus />
          {t.addIncident}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.addIncidentTitle}</DialogTitle>
          <DialogDescription>{t.addIncidentDescription}</DialogDescription>
        </DialogHeader>
        <form action={createAdminAdditionAction} className="admin-incident-form">
          <input type="hidden" name="mealEventId" value={meal.id} />
          <label>
            {t.incidentWard}
            <select name="departmentId" required>
              {meal.departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.incidentDiet}
            <select name="dietMealId" required>
              {meal.diets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.incidentQuantity}
            <input type="number" name="quantity" min="1" step="1" required />
          </label>
          <label>
            {t.incidentReason}
            <textarea name="reason" minLength={3} maxLength={500} required />
          </label>
          <button className="primary-action">{t.saveIncident}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentDetail({ meal, id }: { meal: ManagementMeal; id: string }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management;
  const department = meal.departments.find((item) => item.id === id);
  if (!department) return null;
  const additions = meal.additions.filter((item) => item.departmentId === id);
  return (
    <aside className="admin-serving-detail">
      <header>
        <div>
          <span>{t.wardDetail}</span>
          <h2>{department.name}</h2>
        </div>
        <b>{department.reportId ? t.closed : t.notClosed}</b>
      </header>
      <div className="admin-detail-scroll">
        <dl>
          <div>
            <dt>{t.reporter}</dt>
            <dd>{department.submittedBy ?? "—"}</dd>
          </div>
          <div>
            <dt>{t.time}</dt>
            <dd>{department.submittedAt ? dateTime.format(new Date(department.submittedAt)) : "—"}</dd>
          </div>
        </dl>
        <section>
          <h3>{t.receipt}</h3>
          {department.deliveryReceipt ? (
            <article className={department.deliveryReceipt.status === "SHORT" ? "receipt-warning" : "receipt-ok"}>
              <strong>{department.deliveryReceipt.status === "FULL" ? t.receivedFull : t.receivedShort.replace("{received}", String(department.deliveryReceipt.receivedQuantity)).replace("{expected}", String(department.deliveryReceipt.expectedQuantity))}</strong>
              <p>{department.deliveryReceipt.note ?? t.noDifference}</p>
              <small>
                {department.deliveryReceipt.confirmedBy} · {dateTime.format(new Date(department.deliveryReceipt.confirmedAt))}
              </small>
            </article>
          ) : (
            <p>— · {t.awaitingReceipt}</p>
          )}
        </section>
        <section>
          <h3>{t.structure}</h3>
          <table>
            <thead>
              <tr>
                <th>{t.incidentDiet}</th>
                <th>{t.incidentQuantity}</th>
              </tr>
            </thead>
            <tbody>
              {department.lines.length ? (
                department.lines.map((line) => (
                  <tr key={line.dietCode}>
                    <th>
                      {line.dietCode} · {line.dietName}
                    </th>
                    <td>{number.format(line.quantity)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2}>— · {t.noData}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th>{t.total}</th>
                <td>{department.totalServings === null ? "—" : number.format(department.totalServings)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
        <section>
          <h3>{t.addIncident}</h3>
          {additions.length ? (
            additions.map((item) => (
              <article key={item.id}>
                <strong>
                  +{item.quantity} {t.incidentQuantity} · {item.dietCode}
                </strong>
                <p>{item.reason}</p>
                <small>
                  {t.ack[item.ackStatus]} · {item.submittedBy}
                </small>
              </article>
            ))
          ) : (
            <p>— · {t.noLate}</p>
          )}
        </section>
      </div>
    </aside>
  );
}

function DietDetail({ meal, diet }: { meal: ManagementMeal; diet: ManagementDiet }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management;
  const departments = meal.departments.flatMap((department) => {
    const line = department.lines.find((item) => item.dietCode === diet.code);
    return line ? [{ id: department.id, name: department.name, quantity: line.quantity }] : [];
  });
  return (
    <aside className="admin-serving-detail">
      <header>
        <div>
          <span>{t.dietDetail}</span>
          <h2>
            {diet.code} · {diet.name}
          </h2>
        </div>
        <b>{diet.status === "PLANNED" ? t.notClosed : t.closed}</b>
      </header>
      <div className="admin-detail-scroll">
        <section>
          <h3>{t.byWard}</h3>
          <table>
            <thead>
              <tr>
                <th>{t.incidentWard}</th>
                <th>{t.incidentQuantity}</th>
              </tr>
            </thead>
            <tbody>
              {departments.length ? (
                departments.map((item) => (
                  <tr key={item.id}>
                    <th>{item.name}</th>
                    <td>{item.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2}>— · {t.noInventory}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <section>
          <h3>{t.imagesEvidence}</h3>
          {diet.evidence.length ? (
            <div className="admin-evidence-grid">
              {diet.evidence.map((item) => (
                <article key={item.id}>
                  {item.publicUrl ? <img src={item.publicUrl} alt={t.evidenceAlt.replace("{code}", diet.code)} /> : <span><ImageIcon />—</span>}
                  <strong>{item.kind === "FOOD_SAMPLE" ? t.sampleImage : t.mealImage}</strong>
                  <small>
                    {item.uploadedBy} · {dateTime.format(new Date(item.uploadedAt))}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p>— · {t.noEvidence}</p>
          )}
        </section>
      </div>
    </aside>
  );
}

function ReviewSchedule({ dates, meals, serviceCompletionMinutes, nowIso }: { dates: Array<{ value: string; label: string; active: boolean }>; meals: ManagementMeal[]; serviceCompletionMinutes: number; nowIso: string }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management;
  const searchParams = useSearchParams();
  const activeDate = dates.find((date) => date.active);
  const now = new Date(nowIso);
  const selectedMeal = meals.find((meal) => meal.serviceTime === searchParams.get("meal"))
    ?? (activeDate ? pickCurrentManagementMeal(meals, activeDate.value, now, serviceCompletionMinutes) : undefined)
    ?? meals.at(-1);
  const selectedMealTime = selectedMeal?.serviceTime ?? "";
  const today = hospitalDayKey(now);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="admin-review-trigger">
          <CalendarDays />
          <span>
            <strong>{t.reviewTitle}</strong>
            <small>
              {activeDate?.label ?? "—"} · {selectedMeal?.name ?? "—"}
            </small>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {t.reviewCurrent}: {activeDate?.label ?? "—"} · {selectedMeal?.name ?? "—"}
          </DialogTitle>
          <DialogDescription>{t.reviewDescription}</DialogDescription>
        </DialogHeader>
        <div className="admin-review-legend">
          <span className="past">{t.reviewLegendPast}</span>
          <span className="current">{t.reviewLegendCurrent}</span>
          <span className="future">{t.reviewLegendFuture}</span>
        </div>
        <div className="admin-review-calendar">
          <table>
            <thead>
              <tr>
                <th>{t.mealLabel}</th>
                {dates.map((date) => {
                  const dayTone = date.value < today ? "past" : date.value === today ? "current" : "future";
                  return (
                    <th className={`${dayTone} ${date.active ? "selected" : ""}`} key={date.value}>
                      {date.label}
                      {date.active ? <small>{t.reviewCurrent}</small> : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {meals.map((meal) => (
                <tr key={meal.serviceTime}>
                  <th>
                    <strong>{meal.name}</strong>
                    <small>{meal.serviceTime}</small>
                  </th>
                  {dates.map((date) => {
                    const phase = mealTimePhase(new Date(`${date.value}T00:00:00.000Z`), meal.cutoffTime, meal.serviceTime, now, serviceCompletionMinutes);
                    const tone = phase === "PASSED" ? "past" : phase === "PREPARING" || phase === "SERVING" ? "current" : "future";
                    const selected = date.active && meal.serviceTime === selectedMealTime;
                    return (
                      <td key={date.value}>
                        <Link className={`${tone} ${selected ? "selected" : ""}`} aria-current={selected ? "true" : undefined} href={`?date=${date.value}&meal=${encodeURIComponent(meal.serviceTime)}`}>
                          <Utensils />
                          <span>{meal.name}</span>
                          {tone === "current" ? <small>{t.reviewLegendCurrent}</small> : null}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ManagementBoard({ data, dates, initialMealTime, role, liveClock = true }: { data: ManagementDay; dates: Array<{ value: string; label: string; active: boolean }>; initialMealTime?: string; role: Role; liveClock?: boolean }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management;
  const router = useRouter();
  useEffect(() => {
    if (!liveClock) return;
    const timer = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [liveClock, router]);
  const [mode, setMode] = useState<ViewMode>("department");
  const meal = data.meals.find((item) => item.serviceTime === initialMealTime)
    ?? pickCurrentManagementMeal(data.meals, data.date, new Date(data.generatedAt), data.serviceCompletionMinutes)
    ?? data.meals[0];
  const firstId = mode === "department" ? meal?.departments[0]?.id : meal?.diets[0]?.id;
  const [selectedId, setSelectedId] = useState("");
  const activeId = selectedId || firstId || "";
  const totals = useMemo(() => ({ servings: meal?.reportedServings ?? null, additions: meal?.additions.reduce((sum, item) => sum + item.quantity, 0) ?? 0 }), [meal]);
  if (!meal) return <p>— · {t.noMealToday}</p>;
  return (
    <section className="admin-serving-board">
      <div className="admin-serving-top">
        <MealLifecycleStrip data={data} role={role} selectedMealId={meal.id} liveClock={liveClock} />
        <ReviewSchedule dates={dates} meals={data.meals} serviceCompletionMinutes={data.serviceCompletionMinutes} nowIso={data.generatedAt} />
      </div>
      <div className="admin-serving-grid">
        <section className="admin-serving-master">
          <header>
            <div>
              <span>{t.hospitalWide}</span>
              <h1>{t.today}</h1>
            </div>
            <div className="admin-view-switch">
              <button className={mode === "department" ? "active" : ""} onClick={() => { setMode("department"); setSelectedId(""); }}>
                <LayoutList />
                {t.modeDepartment}
              </button>
              <button className={mode === "diet" ? "active" : ""} onClick={() => { setMode("diet"); setSelectedId(""); }}>
                <Utensils />
                {t.modeDiet}
              </button>
            </div>
            {role === "ADMIN" ? <AddIncident meal={meal} /> : null}
          </header>
          <div className="admin-serving-table">
            <table>
              <thead>
                <tr>
                  <th>{mode === "department" ? t.incidentWard : t.incidentDiet}</th>
                  <th>{t.statusLabel}</th>
                  <th>{t.incidentQuantity}</th>
                  <th>{t.additionCount}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mode === "department" ? meal.departments.map((item) => {
                  const additions = meal.additions.filter((addition) => addition.departmentId === item.id);
                  return (
                    <tr className={activeId === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)} key={item.id}>
                      <th>
                        {item.name}
                        <small>{item.code}</small>
                      </th>
                      <td>{item.reportId ? <span className="ok"><Check />{t.closed}</span> : <span>{t.notClosed}</span>}</td>
                      <td>{item.totalServings ?? "—"}</td>
                      <td>{additions.reduce((sum, value) => sum + value.quantity, 0) || "—"}</td>
                      <td><ChevronRight /></td>
                    </tr>
                  );
                }) : meal.diets.map((item) => {
                  const additions = meal.additions.filter((addition) => addition.dietCode === item.code);
                  return (
                    <tr className={activeId === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)} key={item.id}>
                      <th>
                        {item.code}
                        <small>{item.name}</small>
                      </th>
                      <td>{item.status === "PLANNED" ? t.notClosed : <span className="ok"><Check />{t.closed}</span>}</td>
                      <td>{item.servings ?? "—"}</td>
                      <td>{additions.reduce((sum, value) => sum + value.quantity, 0) || "—"}</td>
                      <td><ChevronRight /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th>{t.total}</th>
                  <td>{mode === "department" ? `${meal.reportedDepartmentCount}/${meal.totalDepartmentCount}` : t.dietCodeCount.replace("{count}", String(meal.diets.length))}</td>
                  <td>{totals.servings ?? "—"}</td>
                  <td>{totals.additions || "—"}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
        {mode === "department" ? <DepartmentDetail meal={meal} id={activeId} /> : <DietDetail meal={meal} diet={meal.diets.find((item) => item.id === activeId) ?? meal.diets[0]} />}
      </div>
    </section>
  );
}
