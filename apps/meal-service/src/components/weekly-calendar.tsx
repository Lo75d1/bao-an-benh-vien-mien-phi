"use client";

import type { FeedingRoute, Role } from "@prisma/client";
import { CalendarCheck, CalendarClock, CalendarDays, ChefHat, ChevronLeft, ChevronRight, Clock3, TriangleAlert, Utensils } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MealDetailDialog } from "@/components/meal-detail-dialog";
import { EmptyState } from "@/components/presentation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslations, readClientLocale } from "@/lib/locale";
import { addDays, displayMealState, nextMealTimelineEvent, pickActiveReportingMeal, rollupMealEventStatus, startOfIsoWeek, toDateKey, type CalendarEvent, type DisplayMealState } from "@/lib/meal-events";
import type { ManagementDay } from "@/lib/management";
import { formatVnDay } from "@/lib/presentation";
import { hasMealBusinessData } from "@/lib/meal-state";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function simpleState(state: DisplayMealState | null) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management.lichPage;
  if (!state) return { label: "—", tone: "empty", Icon: CalendarDays };
  if (state.key === "CLOSED") return { label: state.label ?? "—", tone: "muted", Icon: CalendarCheck };
  if (state.key === "INCOMPLETE") return { label: state.label ?? "—", tone: "danger", Icon: TriangleAlert };
  if (state.key === "PREPARATION") return { label: state.label ?? "—", tone: "warning", Icon: ChefHat };
  if (state.key === "SERVICE") return { label: state.label ?? "—", tone: "active", Icon: Clock3 };
  if (state.key === "REPORTING") return { label: state.label ?? "—", tone: "active", Icon: CalendarClock };
  return { label: t.noData, tone: "muted", Icon: CalendarClock };
}

export function WeeklyCalendar({ events, details, weekStart, dataStartDate, role, route, sondeEnabled = true, serviceCompletionMinutes, initialNowIso, liveClock = true }: { events: CalendarEvent[]; details: ManagementDay[]; weekStart: Date; dataStartDate: string; role: Role; route?: FeedingRoute; sondeEnabled?: boolean; serviceCompletionMinutes: number; initialNowIso: string; liveClock?: boolean }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management.lichPage;
  const [now, setNow] = useState(() => new Date(initialNowIso));
  useEffect(() => {
    if (!liveClock) return;
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [liveClock]);
  const days = DAY_LABELS.map((label, index) => ({
    label,
    date: addDays(weekStart, index),
  }));
  const mealTypes = [...new Map(events.map((event) => [event.mealType.id, event.mealType])).values()];
  const activeReportingMealByDay = new Map(
    days.map((day) => {
      const activeMealId = pickActiveReportingMeal(
        mealTypes.map((mealType) => ({
          id: mealType.id,
          mealDate: day.date,
          cutoffTime: mealType.cutoffTime,
          serviceTime: mealType.serviceTime,
        })),
        now,
        serviceCompletionMinutes,
      )?.id ?? null;
      return [toDateKey(day.date), activeMealId] as const;
    }),
  );
  const byCell = new Map(events.map((event) => [`${toDateKey(event.mealDate)}:${event.mealTypeId}`, event]));
  const routeValue = route ?? "NORMAL";
  const routeParam = `&route=${routeValue}`;
  const currentWeek = startOfIsoWeek(now);
  const canGoNext = role === "ADMIN" || weekStart.getTime() < addDays(currentWeek, 7).getTime();
  const canGoPrevious = toDateKey(addDays(weekStart, -1)) >= dataStartDate;
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const detailByDate = new Map(details.map((day) => [day.date, day]));
  const end = addDays(weekStart, 6);
  const nextEvent = nextMealTimelineEvent(
    events.map((event) => ({
      ...event,
      cutoffTime: event.mealType.cutoffTime,
      serviceTime: event.mealType.serviceTime,
    })),
    now,
  );

  return (
    <>
      <div className="calendar-toolbar">
        <Tabs value={routeValue}>
          <TabsList aria-label={t.routeLabel}>
            <TabsTrigger value="NORMAL" asChild>
              <Link href={`?week=${toDateKey(weekStart)}&route=NORMAL`}>{t.oralRoute}</Link>
            </TabsTrigger>
            {sondeEnabled ? (
              <TabsTrigger value="SONDE" asChild>
                <Link href={`?week=${toDateKey(weekStart)}&route=SONDE`}>{getTranslations(locale).management.scheduleRouteSonde}</Link>
              </TabsTrigger>
            ) : null}
          </TabsList>
        </Tabs>
        {nextEvent ? (
          <div className="calendar-next-event">
            <Clock3 aria-hidden="true" />
            <span>{t.nextEvent}</span>
            <strong>
              {nextEvent.meal.mealType.name} — {nextEvent.kind === "CUTOFF" ? `${t.cutOffPrefix} ${nextEvent.meal.cutoffTime}` : `${t.servicePrefix} ${nextEvent.meal.serviceTime}`}
            </strong>
          </div>
        ) : null}
        <div className="calendar-date-tools">
          <div>
            <span>{t.currentWeek}</span>
            <strong>
              {t.weekRange.replace("{from}", formatVnDay(weekStart)).replace("{to}", formatVnDay(end))}
            </strong>
          </div>
          <nav className="week-nav" aria-label={t.routeLabel}>
            {canGoPrevious ? (
              <Link href={`?week=${toDateKey(addDays(weekStart, -7))}${routeParam}`} aria-label={t.prevWeek}>
                <ChevronLeft aria-hidden="true" />
              </Link>
            ) : null}
            {canGoNext ? (
              <Link href={`?week=${toDateKey(addDays(weekStart, 7))}${routeParam}`} aria-label={t.nextWeek}>
                <ChevronRight aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
          <form method="get" action="/lich">
            <input type="hidden" name="route" value={routeValue} />
            <label htmlFor="calendar-date">{t.chooseDate}</label>
            <input id="calendar-date" name="week" type="date" min={dataStartDate} defaultValue={toDateKey(weekStart)} />
            <button type="submit">{getTranslations(locale).management.scheduleView}</button>
          </form>
        </div>
      </div>
      {mealTypes.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        <div className="calendar-scroll">
          <table className="calendar-table calendar-status-table">
            <thead>
              <tr>
                <th scope="col">{t.mealColumn}</th>
                {days.map((day) => {
                  const key = toDateKey(day.date);
                  return (
                    <th scope="col" className={key === todayKey ? "calendar-today" : key < todayKey ? "calendar-past" : "calendar-future"} key={day.label}>
                      <strong>{day.label}</strong>
                      <time dateTime={key}>{formatVnDay(day.date)}</time>
                      {key === todayKey ? <small>{t.todayMarker}</small> : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {mealTypes.map((mealType) => (
                <tr key={mealType.id}>
                  <th scope="row">
                    <strong>{mealType.name}</strong>
                    <span>{mealType.serviceTime}</span>
                  </th>
                  {days.map((day) => {
                    const dayKey = toDateKey(day.date);
                    const event = byCell.get(`${dayKey}:${mealType.id}`);
                    const storedStatus = rollupMealEventStatus(event?.dietMeals.map((meal) => meal.status) ?? []);
                    const timeState = displayMealState(day.date, mealType.cutoffTime, mealType.serviceTime, storedStatus, now, serviceCompletionMinutes);
                    const candidate = event ? detailByDate.get(dayKey)?.meals.find((meal) => meal.id === event.id) : null;
                    const detail =
                      candidate &&
                      hasMealBusinessData({
                        reportCount: candidate.reportedDepartmentCount,
                        additionCount: candidate.additions.length,
                        receiptCount: candidate.deliveryReceiptCount,
                        inventoryEntryCount: candidate.inventoryEntryCount,
                        plannedServings: candidate.plannedServings,
                        dietStatuses: candidate.diets.map((diet) => diet.status),
                        menuItemCount: candidate.diets.reduce((sum, diet) => sum + diet.menuItems.length, 0),
                        evidenceCount: candidate.diets.reduce((sum, diet) => sum + diet.evidence.length, 0),
                      })
                        ? candidate
                        : null;
                    const activeReportingMealId = activeReportingMealByDay.get(dayKey) ?? null;
                    const state = detail ? timeState : null;
                    const displayState: DisplayMealState | null = state?.key === "REPORTING" && dayKey === todayKey && activeReportingMealId !== mealType.id
                      ? { key: "UPCOMING", label: t.notYet, tone: "muted", isCurrent: false }
                      : state;
                    const status = detail
                      ? simpleState(displayState)
                      : {
                          label: t.noData,
                          tone: "empty",
                          Icon: CalendarDays,
                        };
                    const menuTotal = detail?.diets.length ?? 0;
                    const menuSaved = detail?.diets.filter((diet) => diet.menuItems.length > 0).length ?? 0;
                    const menuLocked = detail?.diets.filter((diet) => diet.approved && diet.menuItems.length > 0).length ?? 0;
                    const menuComplete = menuTotal > 0 && menuSaved === menuTotal;
                    const menuStatus = menuTotal === 0 ? t.menuPending : !menuComplete ? t.menuMissing.replace("{missing}", String(menuTotal - menuSaved)).replace("{total}", String(menuTotal)) : menuLocked === menuTotal ? t.menuLocked.replace("{locked}", String(menuLocked)).replace("{total}", String(menuTotal)) : t.menuReady.replace("{saved}", String(menuSaved)).replace("{total}", String(menuTotal));
                    const factWarning = detail && (displayState?.key === "SERVICE" || displayState?.key === "CLOSED") ? (detail.businessFacts.kitchen !== "PREPARED" ? t.kitchenUnconfirmed : detail.businessFacts.delivery === "UNCONFIRMED" ? t.receiptUnconfirmed : null) : null;
                    const content = (
                      <div className="calendar-status-cell">
                        <span className={`calendar-simple-state ${status.tone}`}>
                          <status.Icon aria-hidden="true" />
                          <strong>{status.label}</strong>
                        </span>
                        {detail ? (
                          <div className="calendar-cell-facts">
                            {displayState?.key === "REPORTING" ? (
                              <span className="reporting-open">
                                {t.departmentReports}{" "}
                                <b>
                                  {detail.reportedDepartmentCount ?? "—"}/{detail.totalDepartmentCount ?? "—"}
                                </b>
                              </span>
                            ) : null}
                            <span>
                              <Utensils aria-hidden="true" /> {t.totalServings} <b>{detail.reportedServings ?? "—"}</b>
                            </span>
                            {factWarning ? <span className="warning">⚠ {factWarning}</span> : null}
                          </div>
                        ) : (
                          <small>{t.noCellData}</small>
                        )}
                        {detail ? (
                          <em className={menuComplete ? "menu-ready" : "menu-missing"}>
                            {menuComplete ? <CalendarCheck aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
                            {menuStatus}
                          </em>
                        ) : null}
                      </div>
                    );
                    return (
                      <td key={dayKey} className={`${dayKey === todayKey ? "calendar-today" : dayKey < todayKey ? "calendar-past" : "calendar-future"} ${displayState?.isCurrent ? "calendar-current-meal" : ""} ${displayState?.tone === "danger" ? "calendar-incomplete" : ""}`}>
                        {detail && displayState ? (
                          <MealDetailDialog
                            meal={detail}
                            date={formatVnDay(day.date)}
                            stateLabel={status.label}
                            canPlanMenu={role === "DIETITIAN" || role === "ADMIN"}
                            trigger={
                              <button type="button" className="calendar-cell-button" aria-label={t.cellDetail.replace("{meal}", mealType.name).replace("{date}", formatVnDay(day.date))}>
                                {content}
                              </button>
                            }
                          />
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="calendar-note">{t.note}</p>
    </>
  );
}
