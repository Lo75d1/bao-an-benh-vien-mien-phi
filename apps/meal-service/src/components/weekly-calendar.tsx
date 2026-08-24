"use client";

import type { FeedingRoute, Role } from "@prisma/client";
import { CalendarCheck, CalendarClock, CalendarDays, ChefHat, ChevronLeft, ChevronRight, Clock3, TriangleAlert, Warehouse } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MealDetailDialog } from "@/components/meal-detail-dialog";
import { EmptyState } from "@/components/presentation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, displayMealState, rollupMealEventStatus, startOfIsoWeek, toDateKey, type CalendarEvent, type DisplayMealState } from "@/lib/meal-events";
import type { ManagementDay } from "@/lib/management";
import { formatVnDay } from "@/lib/presentation";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function simpleState(state: DisplayMealState | null) {
  if (!state) return { label: "—", tone: "empty", Icon: CalendarDays };
  if (state.key === "SERVED") return { label: "Đã hoàn thành", tone: "done", Icon: CalendarCheck };
  if (state.key === "INCOMPLETE") return { label: "Chưa hoàn tất", tone: "danger", Icon: TriangleAlert };
  if (state.key === "PREPARING" || state.key === "COOKING") return { label: "Đang chuẩn bị", tone: "warning", Icon: ChefHat };
  if (state.key === "SERVING") return { label: "Đang tiến hành", tone: "active", Icon: Clock3 };
  return { label: "Chưa đến", tone: "muted", Icon: CalendarClock };
}

export function WeeklyCalendar({ events, details, weekStart, role, route, sondeEnabled = true, serviceCompletionMinutes }: { events: CalendarEvent[]; details: ManagementDay[]; weekStart: Date; role: Role; route?: FeedingRoute; sondeEnabled?: boolean; serviceCompletionMinutes: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  const days = DAY_LABELS.map((label, index) => ({ label, date: addDays(weekStart, index) }));
  const mealTypes = [...new Map(events.map((event) => [event.mealType.id, event.mealType])).values()];
  const byCell = new Map(events.map((event) => [`${toDateKey(event.mealDate)}:${event.mealTypeId}`, event]));
  const routeValue = route ?? "NORMAL";
  const routeParam = `&route=${routeValue}`;
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(startOfIsoWeek(now));
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const detailByDate = new Map(details.map((day) => [day.date, day]));
  const end = addDays(weekStart, 6);

  return <>
    <div className="calendar-toolbar">
      <Tabs value={routeValue}><TabsList aria-label="Loại đường ăn"><TabsTrigger value="NORMAL" asChild><Link href={`?week=${toDateKey(weekStart)}&route=NORMAL`}>Ăn thường</Link></TabsTrigger>{sondeEnabled ? <TabsTrigger value="SONDE" asChild><Link href={`?week=${toDateKey(weekStart)}&route=SONDE`}>Qua sonde</Link></TabsTrigger> : null}</TabsList></Tabs>
      <div className="calendar-date-tools"><div><span>Ngày đang xem</span><strong>{formatVnDay(weekStart)} đến {formatVnDay(end)}</strong></div><nav className="week-nav" aria-label="Chuyển tuần">{role === "ADMIN" || !isCurrentWeek ? <Link href={`?week=${toDateKey(addDays(weekStart, -7))}${routeParam}`} aria-label="Tuần trước"><ChevronLeft aria-hidden="true"/></Link> : null}{role === "ADMIN" || isCurrentWeek ? <Link href={`?week=${toDateKey(addDays(weekStart, 7))}${routeParam}`} aria-label="Tuần sau"><ChevronRight aria-hidden="true"/></Link> : null}</nav><form method="get" action="/lich"><input type="hidden" name="route" value={routeValue}/><label htmlFor="calendar-date">Chọn ngày</label><input id="calendar-date" name="week" type="date" defaultValue={toDateKey(weekStart)}/><button type="submit">Xem</button></form></div>
    </div>
    {mealTypes.length === 0 ? <EmptyState icon={CalendarDays} title="Chưa có loại bữa để hiển thị" description="Hãy kiểm tra dữ liệu loại bữa trước khi mở lịch."/> : <div className="calendar-scroll"><table className="calendar-table calendar-status-table"><thead><tr><th scope="col">Bữa</th>{days.map((day) => { const key = toDateKey(day.date); return <th scope="col" className={key === todayKey ? "calendar-today" : key < todayKey ? "calendar-past" : "calendar-future"} key={day.label}><strong>{day.label}</strong><time dateTime={key}>{formatVnDay(day.date)}</time>{key === todayKey ? <small>Hôm nay</small> : null}</th>; })}</tr></thead><tbody>{mealTypes.map((mealType) => <tr key={mealType.id}><th scope="row"><strong>{mealType.name}</strong><span>{mealType.serviceTime}</span></th>{days.map((day) => {
      const dayKey = toDateKey(day.date);
      const event = byCell.get(`${dayKey}:${mealType.id}`);
      const storedStatus = rollupMealEventStatus(event?.dietMeals.map((meal) => meal.status) ?? []);
      const state = displayMealState(day.date, mealType.cutoffTime, mealType.serviceTime, storedStatus, now, serviceCompletionMinutes);
      const status = simpleState(state);
      const detail = event ? detailByDate.get(dayKey)?.meals.find((meal) => meal.id === event.id) : null;
      const missingMenu = Boolean(detail?.diets.some((diet) => !diet.approved || diet.menuItems.length === 0));
      const content = <div className="calendar-status-cell"><span className={`calendar-simple-state ${status.tone}`}><status.Icon aria-hidden="true"/><strong>{status.label}</strong></span>{detail ? <div className="calendar-cell-facts"><span>Khoa báo <b>{detail.reportedDepartmentCount}/{detail.totalDepartmentCount}</b></span><span><Warehouse aria-hidden="true"/> Nhập kho <b>{detail.inventoryEntryCount || "—"}</b></span></div> : <small>— · Chưa có dữ liệu</small>}{missingMenu ? <em><TriangleAlert aria-hidden="true"/> Thiếu thực đơn</em> : null}</div>;
      return <td key={dayKey} className={`${dayKey === todayKey ? "calendar-today" : dayKey < todayKey ? "calendar-past" : "calendar-future"} ${state?.isCurrent ? "calendar-current-meal" : ""} ${state?.tone === "danger" ? "calendar-incomplete" : ""}`}>{detail && state ? <MealDetailDialog meal={detail} date={formatVnDay(day.date)} stateLabel={status.label} canPlanMenu={role === "DIETITIAN" || role === "ADMIN"} trigger={<button type="button" className="calendar-cell-button" aria-label={`Xem chi tiết ${mealType.name} ${formatVnDay(day.date)}`}>{content}</button>}/> : content}</td>;
    })}</tr>)}</tbody></table></div>}
    <p className="calendar-note">Lịch tự chuyển trạng thái và bữa hiện tại theo giờ bệnh viện; “—” nghĩa là chưa có dữ liệu, không phải 0.</p>
  </>;
}
