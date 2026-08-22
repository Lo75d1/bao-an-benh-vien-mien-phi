import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
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
  const [data, schedule] = await Promise.all([readManagementDay(date), readManagementSchedule(ngay)]);
  return <AppShell user={user}><main className="management-page"><header className="management-date-bar"><div><p className="eyebrow">Điều hành toàn viện</p><h1>Vận hành suất ăn</h1></div><form method="get"><label htmlFor="management-date">Ngày làm việc</label><input id="management-date" name="date" type="date" defaultValue={data.date} autoComplete="off"/><button type="submit">Xem ngày</button></form></header><ManagementBoard data={data}/><ScheduleBoard data={schedule}/></main></AppShell>;
}
