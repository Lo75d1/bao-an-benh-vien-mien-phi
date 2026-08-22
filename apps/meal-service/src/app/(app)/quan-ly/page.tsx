import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { readManagementDay, readManagementSchedule } from "@/lib/management";
import { ManagementBoard } from "./management-board";
import { ScheduleBoard } from "./schedule-board";
import "./quan-ly.css";

export default async function ManagementPage({ searchParams }: { searchParams: Promise<{ date?: string; ngay?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  const { date, ngay } = await searchParams;
  const [dayResult, scheduleResult] = await Promise.allSettled([readManagementDay(date), readManagementSchedule(ngay)]);
  const selectedDate = dayResult.status === "fulfilled" ? dayResult.value.date : date;
  return <AppShell user={user}><main className="management-page"><header className="management-date-bar"><div><p className="eyebrow">Điều hành toàn viện</p><h1>Vận hành suất ăn</h1></div><form method="get"><label htmlFor="management-date">Ngày làm việc</label><input id="management-date" name="date" type="date" defaultValue={selectedDate} autoComplete="off"/><button type="submit">Xem ngày</button></form></header>
    {dayResult.status === "fulfilled" ? <ManagementBoard data={dayResult.value}/> : <section className="management-section-error"><ErrorState title="Chưa tải được bàn điều hành" description="Không thể đọc số suất và trạng thái khoa. Các mục khác vẫn có thể tiếp tục sử dụng."/></section>}
    {scheduleResult.status === "fulfilled" ? <ScheduleBoard data={scheduleResult.value}/> : <section className="management-section-error"><ErrorState title="Chưa tải được lịch xuất ăn" description="Không thể đọc lịch chi tiết trong lúc này. Bàn điều hành phía trên không bị ảnh hưởng."/></section>}
  </main></AppShell>;
}
