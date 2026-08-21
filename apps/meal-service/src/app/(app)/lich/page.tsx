import { redirect } from "next/navigation";
import type { FeedingRoute } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { WeeklyCalendar } from "@/components/weekly-calendar";
import { getSessionUser } from "@/lib/auth";
import { ensureEmptyMealEvents, parseWeek, readCalendarWeek, restrictWeekForRole, toDateKey } from "@/lib/meal-events";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; route?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const [params, settings] = await Promise.all([searchParams, readOperationalSettings()]);
  const requested = parseWeek(params.week);
  const weekStart = restrictWeekForRole(user.role, requested);
  const route: FeedingRoute | undefined = params.route === "NORMAL" || (params.route === "SONDE" && settings.sondeEnabled) ? params.route : settings.sondeEnabled ? undefined : "NORMAL";
  const memberships = user.role === "NURSE" ? await prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true, department: { select: { name: true } } } }) : [];

  await ensureEmptyMealEvents(weekStart, user);
  const events = await readCalendarWeek(weekStart, user.role, memberships.map((item) => item.departmentId), route);
  const end = new Date(weekStart.getTime() + 6 * 86_400_000);

  return (
    <AppShell user={user}>
      <main className="workspace calendar-page">
        <div className="page-heading">
          <div><p className="eyebrow">Lịch tuần</p><h1>{toDateKey(weekStart)} đến {toDateKey(end)}</h1></div>
          {user.role === "NURSE" ? <p className={memberships.length ? "scope-note" : "scope-note warning"}>{memberships.length ? `Phạm vi: ${memberships.map((item) => item.department.name).join(", ")}` : "Chưa được gán khoa; số suất hiển thị —"}</p> : <p className="scope-note">Phạm vi: Toàn viện</p>}
        </div>
        <WeeklyCalendar events={events} weekStart={weekStart} role={user.role} route={route} sondeEnabled={settings.sondeEnabled} />
      </main>
    </AppShell>
  );
}
