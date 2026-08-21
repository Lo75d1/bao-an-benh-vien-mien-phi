import Link from "next/link";
import type { FeedingRoute, Role } from "@prisma/client";
import { addDays, displayedServings, rollupMealEventStatus, startOfIsoWeek, toDateKey, type CalendarEvent } from "@/lib/meal-events";

const STATUS_LABEL = { PLANNED: "Dự kiến", LOCKED: "Đã chốt", PREPARING: "Đang chuẩn bị", PREPARED: "Đã chuẩn bị", SERVED: "Đã phục vụ", CANCELLED: "Đã hủy" } as const;
const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function WeeklyCalendar({ events, weekStart, role, route, sondeEnabled = true }: { events: CalendarEvent[]; weekStart: Date; role: Role; route?: FeedingRoute; sondeEnabled?: boolean }) {
  const days = DAY_LABELS.map((label, index) => ({ label, date: addDays(weekStart, index) }));
  const mealTypes = [...new Map(events.map((event) => [event.mealType.id, event.mealType])).values()];
  const byCell = new Map(events.map((event) => [`${toDateKey(event.mealDate)}:${event.mealTypeId}`, event]));
  const routeParam = route ? `&route=${route}` : "";
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(startOfIsoWeek(new Date()));

  return (
    <>
      <div className="calendar-toolbar">
        <div className="filter-group" aria-label="Lọc đường nuôi">
          {sondeEnabled && <Link className={!route ? "active" : ""} href={`?week=${toDateKey(weekStart)}`}>Tất cả</Link>}
          <Link className={route === "NORMAL" ? "active" : ""} href={`?week=${toDateKey(weekStart)}&route=NORMAL`}>Ăn thường</Link>
          {sondeEnabled && <Link className={route === "SONDE" ? "active" : ""} href={`?week=${toDateKey(weekStart)}&route=SONDE`}>Sonde</Link>}
        </div>
        <div className="week-nav">
          {role === "ADMIN" || !isCurrentWeek ? <Link href={`?week=${toDateKey(addDays(weekStart, -7))}${routeParam}`} aria-label="Tuần trước">← Tuần trước</Link> : <span />}
          {role === "ADMIN" || isCurrentWeek ? <Link href={`?week=${toDateKey(addDays(weekStart, 7))}${routeParam}`}>Tuần sau →</Link> : null}
        </div>
      </div>
      {mealTypes.length === 0 ? (
        <div className="empty-state"><strong>Chưa có loại bữa để hiển thị.</strong><p>Hãy kiểm tra dữ liệu nền MealType trước khi mở lịch.</p></div>
      ) : (
        <div className="calendar-scroll">
          <table className="calendar-table">
            <thead><tr><th scope="col">Bữa</th>{days.map((day) => <th scope="col" key={day.label}><span>{day.label}</span><time dateTime={toDateKey(day.date)}>{day.date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}</time></th>)}</tr></thead>
            <tbody>
              {mealTypes.map((mealType) => (
                <tr key={mealType.id}>
                  <th scope="row"><strong>{mealType.name}</strong><span>{mealType.serviceTime}</span></th>
                  {days.map((day) => {
                    const event = byCell.get(`${toDateKey(day.date)}:${mealType.id}`);
                    const status = rollupMealEventStatus(event?.dietMeals.map((meal) => meal.status) ?? []);
                    return (
                      <td key={toDateKey(day.date)}>
                        <div className="cell-status">{status ? <span className={`status status-${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span> : <span className="missing" title="Chưa có dữ liệu">—</span>}</div>
                        {event?.dietMeals.length ? <><div className="diet-list">{event.dietMeals.map((meal) => { const servings = displayedServings(event, meal.id, role); return <div className="diet-chip" key={meal.id} title={meal.menuSnapshotJson ? undefined : "Chưa có thực đơn"}><span>{meal.dietType.code}{meal.menuSnapshotJson ? "" : " · !"}</span><strong className="tabular">{servings ?? "—"}</strong></div>; })}</div>{event.dietMeals.some((meal) => !meal.menuSnapshotJson) ? <p className="cell-warning">! Chưa có thực đơn</p> : null}</> : <p className="cell-warning">Chưa có chế độ ăn</p>}
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
