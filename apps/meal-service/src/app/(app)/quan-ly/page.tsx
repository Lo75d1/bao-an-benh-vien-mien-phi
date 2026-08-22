import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { readManagementDay, readManagementSchedule } from "@/lib/management";
import { CurrentClock } from "./current-clock";
import { ManagementBoard } from "./management-board";
import { ScheduleBoard } from "./schedule-board";
import { SectionNav } from "./section-nav";
import "./quan-ly.css";

export default async function ManagementPage({ searchParams }: { searchParams: Promise<{ date?: string; ngay?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  const { date, ngay } = await searchParams;
  const [data, schedule] = await Promise.all([readManagementDay(date), readManagementSchedule(ngay)]);
  return <AppShell user={user}><main className="management-page"><header className="management-page-header"><div><p className="eyebrow">Quản trị · Chỉ xem</p><h1>Quản lý</h1><p>Theo dõi bếp và báo suất của tất cả khoa trên một màn hình.</p></div><div className="management-header-tools"><form method="get"><label htmlFor="management-date">Ngày</label><input id="management-date" name="date" type="date" defaultValue={data.date} autoComplete="off" /><button type="submit">Xem ngày</button></form><CurrentClock /></div></header><div className="management-content-layout"><SectionNav /><div className="management-content"><ManagementBoard data={data} /><ScheduleBoard data={schedule} /></div></div></main></AppShell>;
}
