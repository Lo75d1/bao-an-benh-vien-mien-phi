import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/presentation";
import { VoiceNotificationControl } from "@/components/voice-notification-control";
import { getSessionUser } from "@/lib/auth";
import { mealOverrideForClock } from "@/lib/demo-meal-context";
import { addDays, hospitalDayKey, mealTimePhase } from "@/lib/meal-events";
import { readManagementDay } from "@/lib/management";
import { prisma } from "@/lib/prisma";
import { readRequestClock } from "@/lib/request-clock";
import { clampDateToDataStart, readOperationalSettings } from "@/lib/settings";
import { synchronizeSystemTimeline } from "@/lib/system-timeline";
import { readDemoSession } from "@/lib/demo-session";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { ManagementBoard } from "./management-board";

const shortDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });

export default async function ManagementPage({ searchParams }: { searchParams: Promise<{ date?: string; meal?: string; demoNow?: string }> }) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "DIETITIAN"].includes(user.role)) redirect("/");
  const query = await searchParams;
  const locale = await readLocale();
  const t = getTranslations(locale).management;
  const [settings, clock] = await Promise.all([readOperationalSettings(), readRequestClock(query.demoNow)]);
  if (!clock.simulated) await synchronizeSystemTimeline(user, clock.now);
  const selected = clampDateToDataStart(query.date ?? hospitalDayKey(clock.now), settings.dataStartDate);
  const center = new Date(`${selected}T00:00:00.000Z`);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(center, index - 3);
    const value = day.toISOString().slice(0, 10);
    return { value, label: shortDate.format(day), active: value === selected };
  }).filter((date) => date.value >= settings.dataStartDate);
  const [dayResult] = await Promise.allSettled([readManagementDay(selected, clock.now, undefined, undefined, settings.serviceCompletionMinutes)]);
  const dayData = dayResult.status === "fulfilled" ? dayResult.value : null;
  const eventIds = dayData?.meals.map((meal) => meal.id) ?? [];
  const [pendingVoiceEvents, reportVoiceEvents, handoffVoiceEvents] = eventIds.length ? await Promise.all([
    prisma.lateMealAddition.findMany({ where: { mealEventId: { in: eventIds }, ackStatus: "PENDING" }, select: { id: true, mealEvent: { select: { mealType: { select: { feedingRoute: true } } } } } }),
    prisma.servingReport.findMany({ where: { mealEventId: { in: eventIds }, status: "SUBMITTED" }, select: { id: true, mealEvent: { select: { mealType: { select: { feedingRoute: true } } } } } }),
    prisma.mealHandoff.findMany({ where: { mealEventId: { in: eventIds } }, select: { id: true, mealEvent: { select: { mealType: { select: { feedingRoute: true } } } } } }),
  ]) : [[], [], []];
  const demo = await readDemoSession();
  const demoVoiceEvents = demo ? [
    ...demo.state.additions.filter((item) => eventIds.includes(item.mealEventId) && item.ackStatus === "PENDING").map((item) => ({ key: `${item.feedingRoute}:demo:addition:${item.id}`, message: t.voiceAddition })),
    ...demo.state.reports.filter((item) => eventIds.includes(item.mealEventId)).map((item) => ({ key: `demo:report:${item.mealEventId}:${item.departmentId}`, message: t.voiceReport })),
    ...demo.state.handoffs.filter((item) => eventIds.includes(item.mealEventId)).map((item) => ({ key: `demo:handoff:${item.mealEventId}:${item.departmentId}`, message: t.voiceHandoff })),
  ] : [];
  const voiceEvents = [
    ...pendingVoiceEvents.map((item) => ({ key: `${item.mealEvent.mealType.feedingRoute}:addition:${item.id}`, message: t.voiceAddition })),
    ...reportVoiceEvents.map((item) => ({ key: `${item.mealEvent.mealType.feedingRoute}:report:${item.id}`, message: t.voiceReport })),
    ...handoffVoiceEvents.map((item) => ({ key: `${item.mealEvent.mealType.feedingRoute}:handoff:${item.id}`, message: t.voiceHandoff })),
    ...demoVoiceEvents,
  ];
  const notifications = dayData?.meals.flatMap((meal) => {
    const items = [];
    const missing = meal.totalDepartmentCount - meal.reportedDepartmentCount;
    if (missing > 0) items.push({ id: `${meal.id}-reports`, label: t.notificationReports.replace("{name}", meal.name).replace("{count}", String(missing)), detail: t.notificationReportsDetail.replace("{cutoff}", meal.cutoffTime) });
    if (meal.unapprovedDiets > 0) items.push({ id: `${meal.id}-menus`, label: t.notificationMenus.replace("{name}", meal.name).replace("{count}", String(meal.unapprovedDiets)), detail: t.notificationMenusDetail });
    const pending = meal.additions.filter((item) => item.ackStatus === "PENDING").length;
    if (pending > 0) items.push({ id: `${meal.id}-additions`, label: t.notificationAdditions.replace("{name}", meal.name).replace("{count}", String(pending)), detail: t.notificationAdditionsDetail });
    const phase = mealTimePhase(center, meal.cutoffTime, meal.serviceTime, new Date(dayData.generatedAt), dayData.serviceCompletionMinutes);
    const missingReceipts = meal.reportedDepartmentCount - meal.deliveryReceiptCount;
    if ((phase === "SERVING" || phase === "PASSED") && missingReceipts > 0) items.push({ id: `${meal.id}-receipts`, label: t.notificationReceipts.replace("{name}", meal.name).replace("{count}", String(missingReceipts)), detail: t.notificationReceiptsDetail });
    return items;
  }) ?? [];
  return (
    <AppShell
      user={user}
      adminNotifications={notifications}
      demoClock={clock.enabled ? { nowIso: clock.now.toISOString(), simulated: clock.simulated } : undefined}
      workflowStatus={<VoiceNotificationControl workspace="admin" scope={selected} events={voiceEvents} />}
    >
      <main className="management-page">
        {dayData ? (
          <ManagementBoard
            data={dayData}
            dates={dates}
            initialMealTime={mealOverrideForClock(query.meal, clock.simulated)}
            role={user.role}
            liveClock={!clock.simulated}
          />
        ) : (
          <ErrorState title={t.noDayTitle} description={t.noDayDescription} />
        )}
      </main>
    </AppShell>
  );
}
