"use client";

import type { FeedingRoute, Role } from "@prisma/client";
import { CalendarCheck, CalendarClock, CalendarDays, ChefHat, ChevronLeft, ChevronRight, Clock3, TriangleAlert, Utensils } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MealDetailDialog } from "@/components/meal-detail-dialog";
import { EmptyState } from "@/components/presentation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, displayMealState, nextMealTimelineEvent, rollupMealEventStatus, startOfIsoWeek, toDateKey, type CalendarEvent, type DisplayMealState } from "@/lib/meal-events";
import type { ManagementDay } from "@/lib/management";
import { formatVnDay } from "@/lib/presentation";
import { hasMealBusinessData } from "@/lib/meal-state";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function simpleState(state: DisplayMealState | null) {
  if (!state) return { label: "—", tone: "empty", Icon: CalendarDays };
  if (state.key === "CLOSED") return { label: "Đã đóng", tone: "muted", Icon: CalendarCheck };
  if (state.key === "INCOMPLETE") return { label: "Chưa hoàn tất", tone: "danger", Icon: TriangleAlert };
  if (state.key === "PREPARATION") return { label: "Giai đoạn chuẩn bị", tone: "warning", Icon: ChefHat };
  if (state.key === "SERVICE") return { label: "Đang phục vụ", tone: "active", Icon: Clock3 };
  if (state.key === "REPORTING") return { label: "Đang nhận báo", tone: "active", Icon: CalendarClock };
  return { label: "Chưa đến", tone: "muted", Icon: CalendarClock };
}

export function WeeklyCalendar({ events, details, weekStart, dataStartDate, role, route, sondeEnabled = true, serviceCompletionMinutes, initialNowIso, liveClock = true }: { events: CalendarEvent[]; details: ManagementDay[]; weekStart: Date; dataStartDate: string; role: Role; route?: FeedingRoute; sondeEnabled?: boolean; serviceCompletionMinutes: number; initialNowIso: string; liveClock?: boolean }) {
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
  const displayStates = events.map((event) => ({
    event,
    state: displayMealState(event.mealDate, event.mealType.cutoffTime, event.mealType.serviceTime, rollupMealEventStatus(event.dietMeals.map((meal) => meal.status) ?? []), now, serviceCompletionMinutes),
  }));
  const currentOperationalEvent = displayStates.find((item) => item.state?.isCurrent);
  const reportingOperationalEvent = currentOperationalEvent ? null : displayStates.find((item) => item.state?.key === "REPORTING");
  const activeOperationalEventId = currentOperationalEvent?.event.id ?? reportingOperationalEvent?.event.id ?? null;

  return (
    <>
      <div className="calendar-toolbar">
        <Tabs value={routeValue}>
          <TabsList aria-label="Loại đường ăn">
            <TabsTrigger value="NORMAL" asChild>
              <Link href={`?week=${toDateKey(weekStart)}&route=NORMAL`}>Ăn thường</Link>
            </TabsTrigger>
            {sondeEnabled ? (
              <TabsTrigger value="SONDE" asChild>
                <Link href={`?week=${toDateKey(weekStart)}&route=SONDE`}>Qua sonde</Link>
              </TabsTrigger>
            ) : null}
          </TabsList>
        </Tabs>
        {nextEvent ? (
          <div className="calendar-next-event">
            <Clock3 aria-hidden="true" />
            <span>Sự kiện tiếp theo</span>
            <strong>
              {nextEvent.meal.mealType.name} — {nextEvent.kind === "CUTOFF" ? `Chốt suất ăn ${nextEvent.meal.cutoffTime}` : `Phục vụ ${nextEvent.meal.serviceTime}`}
            </strong>
          </div>
        ) : null}
        <div className="calendar-date-tools">
          <div>
            <span>Ngày đang xem</span>
            <strong>
              {formatVnDay(weekStart)} đến {formatVnDay(end)}
            </strong>
          </div>
          <nav className="week-nav" aria-label="Chuyển tuần">
            {canGoPrevious ? (
              <Link href={`?week=${toDateKey(addDays(weekStart, -7))}${routeParam}`} aria-label="Tuần trước">
                <ChevronLeft aria-hidden="true" />
              </Link>
            ) : null}
            {canGoNext ? (
              <Link href={`?week=${toDateKey(addDays(weekStart, 7))}${routeParam}`} aria-label="Tuần sau">
                <ChevronRight aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
          <form method="get" action="/lich">
            <input type="hidden" name="route" value={routeValue} />
            <label htmlFor="calendar-date">Chọn ngày</label>
            <input id="calendar-date" name="week" type="date" min={dataStartDate} defaultValue={toDateKey(weekStart)} />
            <button type="submit">Xem</button>
          </form>
        </div>
      </div>
      {mealTypes.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Chưa có loại bữa để hiển thị" description="Hãy kiểm tra dữ liệu loại bữa trước khi mở lịch." />
      ) : (
        <div className="calendar-scroll">
          <table className="calendar-table calendar-status-table">
            <thead>
              <tr>
                <th scope="col">Bữa</th>
                {days.map((day) => {
                  const key = toDateKey(day.date);
                  return (
                    <th scope="col" className={key === todayKey ? "calendar-today" : key < todayKey ? "calendar-past" : "calendar-future"} key={day.label}>
                      <strong>{day.label}</strong>
                      <time dateTime={key}>{formatVnDay(day.date)}</time>
                      {key === todayKey ? <small>Hôm nay</small> : null}
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
                    const rawTimeState = displayMealState(day.date, mealType.cutoffTime, mealType.serviceTime, storedStatus, now, serviceCompletionMinutes);
                    const timeState = rawTimeState?.key === "REPORTING" && event?.id !== activeOperationalEventId
                      ? { ...rawTimeState, key: "UPCOMING" as const, label: "Chưa đến", tone: "muted" as const, isCurrent: false }
                      : rawTimeState;
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
                    const state = detail ? timeState : null;
                    const status = detail
                      ? simpleState(state)
                      : {
                          label: "Không có dữ liệu",
                          tone: "empty",
                          Icon: CalendarDays,
                        };
                    const menuTotal = detail?.diets.length ?? 0;
                    const menuSaved = detail?.diets.filter((diet) => diet.menuItems.length > 0).length ?? 0;
                    const menuLocked = detail?.diets.filter((diet) => diet.approved && diet.menuItems.length > 0).length ?? 0;
                    const menuComplete = menuTotal > 0 && menuSaved === menuTotal;
                    const menuStatus = menuTotal === 0 ? "Thực đơn —" : !menuComplete ? `Thiếu thực đơn ${menuTotal - menuSaved}/${menuTotal}` : menuLocked === menuTotal ? `Thực đơn đã chốt ${menuLocked}/${menuTotal}` : `Đã lên thực đơn ${menuSaved}/${menuTotal} · Chờ tự khóa`;
                    const factWarning = detail && (state?.key === "SERVICE" || state?.key === "CLOSED") ? (detail.businessFacts.kitchen !== "PREPARED" ? "Bếp chưa xác nhận xong" : detail.businessFacts.delivery === "UNCONFIRMED" ? "Khoa chưa xác nhận nhận suất" : null) : null;
                    const content = (
                      <div className="calendar-status-cell">
                        <span className={`calendar-simple-state ${status.tone}`}>
                          <status.Icon aria-hidden="true" />
                          <strong>{status.label}</strong>
                        </span>
                        {detail ? (
                          <div className="calendar-cell-facts">
                            {state?.key === "REPORTING" ? (
                              <span className="reporting-open">
                                Khoa báo{" "}
                                <b>
                                  {detail.reportedDepartmentCount ?? "—"}/{detail.totalDepartmentCount ?? "—"}
                                </b>
                              </span>
                            ) : null}
                            <span>
                              <Utensils aria-hidden="true" /> Tổng suất <b>{detail.reportedServings ?? "—"}</b>
                            </span>
                            {factWarning ? <span className="warning">⚠ {factWarning}</span> : null}
                          </div>
                        ) : (
                          <small>— · Chưa có dữ liệu</small>
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
                      <td key={dayKey} className={`${dayKey === todayKey ? "calendar-today" : dayKey < todayKey ? "calendar-past" : "calendar-future"} ${state?.isCurrent ? "calendar-current-meal" : ""} ${state?.tone === "danger" ? "calendar-incomplete" : ""}`}>
                        {detail && state ? (
                          <MealDetailDialog
                            meal={detail}
                            date={formatVnDay(day.date)}
                            stateLabel={status.label}
                            canPlanMenu={role === "DIETITIAN" || role === "ADMIN"}
                            trigger={
                              <button type="button" className="calendar-cell-button" aria-label={`Xem chi tiết ${mealType.name} ${formatVnDay(day.date)}`}>
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
      <p className="calendar-note">Lịch tự chuyển trạng thái và bữa hiện tại theo giờ bệnh viện; “—” nghĩa là chưa có dữ liệu, không phải 0.</p>
    </>
  );
}
