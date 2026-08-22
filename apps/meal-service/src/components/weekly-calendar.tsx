"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FeedingRoute, Role } from "@prisma/client";
import { CalendarDays, ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { addDays, displayMealState, displayedServings, rollupMealEventStatus, startOfIsoWeek, toDateKey, type CalendarEvent } from "@/lib/meal-events";
import type { ManagementDay } from "@/lib/management";
import { DietName, EmptyState } from "@/components/presentation";
import { MealDetailDialog } from "@/components/meal-detail-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatVnDay } from "@/lib/presentation";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function WeeklyCalendar({ events, details, weekStart, role, route, sondeEnabled = true }: { events: CalendarEvent[]; details: ManagementDay[]; weekStart: Date; role: Role; route?: FeedingRoute; sondeEnabled?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  const days = DAY_LABELS.map((label, index) => ({ label, date: addDays(weekStart, index) }));
  const mealTypes = [...new Map(events.map((event) => [event.mealType.id, event.mealType])).values()];
  const byCell = new Map(events.map((event) => [`${toDateKey(event.mealDate)}:${event.mealTypeId}`, event]));
  const routeParam = route ? `&route=${route}` : "";
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(startOfIsoWeek(new Date()));
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const detailByDate = new Map(details.map((day) => [day.date, day]));

  return (
    <>
      <div className="calendar-toolbar">
        <Tabs value={route ?? "ALL"}><TabsList aria-label="Lọc đường nuôi">{sondeEnabled && <TabsTrigger value="ALL" asChild><Link href={`?week=${toDateKey(weekStart)}`}>Tất cả</Link></TabsTrigger>}<TabsTrigger value="NORMAL" asChild><Link href={`?week=${toDateKey(weekStart)}&route=NORMAL`}>Ăn thường</Link></TabsTrigger>{sondeEnabled && <TabsTrigger value="SONDE" asChild><Link href={`?week=${toDateKey(weekStart)}&route=SONDE`}>Sonde</Link></TabsTrigger>}</TabsList></Tabs>
        <div className="week-nav">
          {role === "ADMIN" || !isCurrentWeek ? <Link href={`?week=${toDateKey(addDays(weekStart, -7))}${routeParam}`} aria-label="Tuần trước"><ChevronLeft aria-hidden="true"/> Tuần trước</Link> : <span />}
          {role === "ADMIN" || isCurrentWeek ? <Link href={`?week=${toDateKey(addDays(weekStart, 7))}${routeParam}`}>Tuần sau <ChevronRight aria-hidden="true"/></Link> : null}
        </div>
      </div>
      {mealTypes.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Chưa có loại bữa để hiển thị" description="Hãy kiểm tra dữ liệu loại bữa trước khi mở lịch." />
      ) : (
        <div className="calendar-scroll">
          <table className="calendar-table">
            <thead><tr><th scope="col">Bữa</th>{days.map((day) => { const key = toDateKey(day.date); return <th scope="col" className={key === todayKey ? "calendar-today" : key < todayKey ? "calendar-past" : "calendar-future"} key={day.label}><time dateTime={key}>{formatVnDay(day.date)}</time>{key === todayKey ? <small>Hôm nay</small> : null}</th>; })}</tr></thead>
            <tbody>
              {mealTypes.map((mealType) => (
                <tr key={mealType.id}>
                  <th scope="row"><strong>{mealType.name}</strong><span>{mealType.serviceTime}</span></th>
                  {days.map((day) => {
                    const event = byCell.get(`${toDateKey(day.date)}:${mealType.id}`);
                    const storedStatus = rollupMealEventStatus(event?.dietMeals.map((meal) => meal.status) ?? []);
                    const state = displayMealState(day.date, mealType.cutoffTime, mealType.serviceTime, storedStatus, now);
                    const dayKey = toDateKey(day.date);
                    const detail = event ? detailByDate.get(dayKey)?.meals.find((meal) => meal.id === event.id) : null;
                    const content = <div className="calendar-cell-content"><div className="cell-status">{state ? <span className={`calendar-state ${state.tone}`}>{state.label}</span> : <TooltipProvider><Tooltip><TooltipTrigger className="missing">—</TooltipTrigger><TooltipContent>Chưa có dữ liệu</TooltipContent></Tooltip></TooltipProvider>}</div>{event?.dietMeals.length ? <><div className="diet-list">{event.dietMeals.map((meal) => { const servings = displayedServings(event, meal.id, role); return <div className="diet-chip" key={meal.id}><span><DietName name={meal.dietType.name} code={meal.dietType.code}/>{meal.menuSnapshotJson ? "" : " · !"}</span><strong className="tabular">{servings ?? "—"}</strong></div>; })}</div>{event.dietMeals.some((meal) => !meal.menuSnapshotJson) ? <p className="cell-warning"><Utensils aria-hidden="true"/> Chưa có thực đơn</p> : null}</> : <p className="cell-warning">— Chưa có chế độ ăn</p>}</div>;
                    return (
                      <td key={dayKey} className={`${dayKey === todayKey ? "calendar-today" : dayKey < todayKey ? "calendar-past" : "calendar-future"} ${state?.isCurrent ? "calendar-current-meal" : ""} ${state?.tone === "danger" ? "calendar-incomplete" : ""}`}>
                        {detail && state ? <MealDetailDialog meal={detail} date={formatVnDay(day.date)} stateLabel={state.label} trigger={<button type="button" className="calendar-cell-button" aria-label={`Xem chi tiết ${mealType.name} ${formatVnDay(day.date)}`}>{content}</button>}/> : content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="calendar-note">Số bên phải chip là số suất đã ghi nhận; “—” nghĩa là chưa có dữ liệu, không phải 0.</p>
    </>
  );
}
