import { redirect } from "next/navigation";
import type { FeedingRoute } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { WeeklyCalendar } from "@/components/weekly-calendar";
import { getSessionUser } from "@/lib/auth";
import { addDays, ensureEmptyMealEvents, parseWeek, readCalendarWeek, restrictWeekForRole, toDateKey } from "@/lib/meal-events";
import { readManagementDay } from "@/lib/management";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { prisma } from "@/lib/prisma";
import { clampDateToDataStart, readOperationalSettings } from "@/lib/settings";
import { readRequestClock } from "@/lib/request-clock";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; route?: string; demoNow?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const params = await searchParams;
  const locale = await readLocale();
  const t = getTranslations(locale).management;
  const [settings, clock] = await Promise.all([readOperationalSettings(), readRequestClock(params.demoNow)]);
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
  return (
    <AppShell user={user} locale={locale} demoClock={clock.enabled ? { nowIso: clock.now.toISOString(), simulated: clock.simulated } : undefined}>
      <main className="workspace calendar-page">
        <WeeklyCalendar events={events} details={details} weekStart={weekStart} dataStartDate={settings.dataStartDate} role={user.role} route={route} sondeEnabled={settings.sondeEnabled} serviceCompletionMinutes={settings.serviceCompletionMinutes} initialNowIso={clock.now.toISOString()} liveClock={!clock.simulated} />
        {user.role === "NURSE" && !memberships.length ? <p className="calendar-scope-warning">{t.calendarScopeWarning}</p> : null}
      </main>
    </AppShell>
  );
}
