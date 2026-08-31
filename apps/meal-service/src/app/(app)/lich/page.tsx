import { redirect } from "next/navigation";
import type { FeedingRoute } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { WeeklyCalendar } from "@/components/weekly-calendar";
import { getSessionUser } from "@/lib/auth";
import { addDays, ensureEmptyMealEvents, parseWeek, readCalendarWeek, restrictWeekForRole, toDateKey } from "@/lib/meal-events";
import { readManagementDay } from "@/lib/management";
import { prisma } from "@/lib/prisma";
import { clampDateToDataStart, readOperationalSettings } from "@/lib/settings";
import { readRequestClock } from "@/lib/request-clock";
import { normalizeLanguage } from "@/lib/i18n";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; route?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const [params, settings, clock] = await Promise.all([searchParams, readOperationalSettings(), readRequestClock()]);
  const earliestWeek = parseWeek(settings.dataStartDate, clock.now);
  const parsedRequested = parseWeek(params.week ? clampDateToDataStart(params.week, settings.dataStartDate) : undefined, clock.now);
  const requested = parsedRequested < earliestWeek ? earliestWeek : parsedRequested;
  const weekStart = restrictWeekForRole(user.role, requested, clock.now);
  const route: FeedingRoute = params.route === "SONDE" && settings.sondeEnabled ? "SONDE" : "NORMAL";
  const memberships = user.role === "NURSE" ? await prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true, department: { select: { name: true } } } }) : [];

  await ensureEmptyMealEvents(weekStart, user);
  const departmentIds = memberships.map((item) => item.departmentId);
  const [events, details] = await Promise.all([
    readCalendarWeek(weekStart, user.role, departmentIds, route),
    Promise.all(Array.from({ length: 7 }, (_, index) => readManagementDay(toDateKey(addDays(weekStart, index)), clock.now, user.role === "NURSE" ? departmentIds : undefined, route, settings.serviceCompletionMinutes))),
  ]);
  const language = normalizeLanguage(user.language);
  return (
    <AppShell user={user}>
      <main className="workspace calendar-page">
        <WeeklyCalendar events={events} details={details} weekStart={weekStart} dataStartDate={settings.dataStartDate} role={user.role} route={route} sondeEnabled={settings.sondeEnabled} serviceCompletionMinutes={settings.serviceCompletionMinutes} initialNowIso={clock.now.toISOString()} liveClock={!clock.simulated} language={language} />
        {user.role === "NURSE" && !memberships.length ? <p className="calendar-scope-warning">{language === "en" ? "No department assigned; department-scoped data is shown as —." : "Chưa được gán khoa; dữ liệu phạm vi khoa hiển thị —."}</p> : null}
      </main>
    </AppShell>
  );
}
