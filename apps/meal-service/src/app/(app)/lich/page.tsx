import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import type { FeedingRoute } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { CurrentMealLifecycle } from "@/components/current-meal-lifecycle";
import { WeeklyCalendar } from "@/components/weekly-calendar";
import { PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { addDays, ensureEmptyMealEvents, parseWeek, readCalendarWeek, restrictWeekForRole, toDateKey } from "@/lib/meal-events";
import { readManagementDay } from "@/lib/management";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";
import { formatVnDay } from "@/lib/presentation";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; route?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const [params, settings] = await Promise.all([searchParams, readOperationalSettings()]);
  const requested = parseWeek(params.week);
  const weekStart = restrictWeekForRole(user.role, requested);
  const route: FeedingRoute | undefined = params.route === "NORMAL" || (params.route === "SONDE" && settings.sondeEnabled) ? params.route : settings.sondeEnabled ? undefined : "NORMAL";
  const memberships = user.role === "NURSE" ? await prisma.departmentMembership.findMany({ where: { userId: user.id }, select: { departmentId: true, department: { select: { name: true } } } }) : [];

  await ensureEmptyMealEvents(weekStart, user);
  const departmentIds = memberships.map((item) => item.departmentId);
  const [events, details] = await Promise.all([
    readCalendarWeek(weekStart, user.role, departmentIds, route),
    Promise.all(Array.from({ length: 7 }, (_, index) => readManagementDay(toDateKey(addDays(weekStart, index)), new Date(), user.role === "NURSE" ? departmentIds : undefined, route))),
  ]);
  const end = new Date(weekStart.getTime() + 6 * 86_400_000);

  return (
    <AppShell user={user}>
      <main className="workspace calendar-page"><Separator className="page-separator" aria-hidden="true"/>
        <CurrentMealLifecycle role={user.role}/>
        <PageHeader eyebrow="Lịch tuần" title={`${formatVnDay(weekStart)} đến ${formatVnDay(end)}`} description="Theo dõi trạng thái bữa, thực đơn và số suất đã ghi nhận." actions={user.role === "NURSE" ? <p className={memberships.length ? "scope-note" : "scope-note warning"}>{memberships.length ? `Phạm vi: ${memberships.map((item) => item.department.name).join(", ")}` : "Chưa được gán khoa; số suất hiển thị —"}</p> : <p className="scope-note">Phạm vi: Toàn viện</p>}/>
        <WeeklyCalendar events={events} details={details} weekStart={weekStart} role={user.role} route={route} sondeEnabled={settings.sondeEnabled} />
      </main>
    </AppShell>
  );
}
