import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { addDays, hospitalDayKey, mealTimePhase } from "@/lib/meal-events";
import { readManagementDay } from "@/lib/management";
import { synchronizeSystemTimeline } from "@/lib/system-timeline";
import { clampDateToDataStart, readOperationalSettings } from "@/lib/settings";
import { readRequestClock } from "@/lib/request-clock";
import { prisma } from "@/lib/prisma";
import { VoiceNotificationControl } from "@/components/voice-notification-control";
import { ManagementBoard } from "./management-board";

const shortDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });
export default async function ManagementPage({ searchParams }: { searchParams: Promise<{ date?: string; meal?: string }> }) {
  const user = await getSessionUser(); if (!user || !["ADMIN", "DIETITIAN"].includes(user.role)) redirect("/");
  const [query, settings, clock] = await Promise.all([searchParams, readOperationalSettings(), readRequestClock()]);
  if (!clock.simulated) await synchronizeSystemTimeline(user, clock.now);
  const selected = clampDateToDataStart(query.date ?? hospitalDayKey(clock.now), settings.dataStartDate);
  const center = new Date(`${selected}T00:00:00.000Z`); const dates = Array.from({ length: 7 }, (_, index) => { const day = addDays(center, index - 3); const value = day.toISOString().slice(0, 10); return { value, label: shortDate.format(day), active: value === selected }; }).filter((date) => date.value >= settings.dataStartDate);
  const dayResult = await Promise.allSettled([readManagementDay(selected, clock.now, undefined, undefined, settings.serviceCompletionMinutes)]); const dayData = dayResult[0].status === "fulfilled" ? dayResult[0].value : null;
  const eventIds = dayData?.meals.map((meal) => meal.id) ?? [];
  const [pendingVoiceEvents, reportVoiceEvents, handoffVoiceEvents] = eventIds.length ? await Promise.all([
    prisma.lateMealAddition.findMany({ where: { mealEventId: { in: eventIds }, ackStatus: "PENDING" }, select: { id: true, mealEvent: { select: { mealType: { select: { feedingRoute: true } } } } } }),
    prisma.servingReport.findMany({ where: { mealEventId: { in: eventIds }, status: "SUBMITTED" }, select: { id: true, mealEvent: { select: { mealType: { select: { feedingRoute: true } } } } } }),
    prisma.mealHandoff.findMany({ where: { mealEventId: { in: eventIds } }, select: { id: true, mealEvent: { select: { mealType: { select: { feedingRoute: true } } } } } }),
  ]) : [[], [], []];
  const voiceEvents = [
    ...pendingVoiceEvents.map((item) => ({ key: `${item.mealEvent.mealType.feedingRoute}:addition:${item.id}`, message: "Có báo bổ sung suất ăn mới. Vui lòng kiểm tra." })),
    ...reportVoiceEvents.map((item) => ({ key: `${item.mealEvent.mealType.feedingRoute}:report:${item.id}`, message: "Có khoa vừa gửi báo suất ăn. Vui lòng kiểm tra." })),
    ...handoffVoiceEvents.map((item) => ({ key: `${item.mealEvent.mealType.feedingRoute}:handoff:${item.id}`, message: "Bếp vừa bàn giao suất ăn cho khoa. Vui lòng kiểm tra." })),
  ];
  const notifications = dayData?.meals.flatMap((meal) => { const items = []; const missing = meal.totalDepartmentCount - meal.reportedDepartmentCount; if (missing > 0) items.push({ id: `${meal.id}-reports`, label: `${meal.name}: ${missing} khoa chưa chốt`, detail: `Giờ chốt ${meal.cutoffTime}` }); if (meal.unapprovedDiets > 0) items.push({ id: `${meal.id}-menus`, label: `${meal.name}: thiếu ${meal.unapprovedDiets} thực đơn`, detail: "Cần bổ sung thực đơn trước giờ khóa" }); const pending = meal.additions.filter((item) => item.ackStatus === "PENDING").length; if (pending > 0) items.push({ id: `${meal.id}-additions`, label: `${meal.name}: ${pending} phát sinh chờ bếp`, detail: "Cần bếp xác nhận khả năng chuẩn bị" }); const phase = mealTimePhase(center, meal.cutoffTime, meal.serviceTime, new Date(dayData.generatedAt), dayData.serviceCompletionMinutes); const missingReceipts = meal.reportedDepartmentCount - meal.deliveryReceiptCount; if ((phase === "SERVING" || phase === "PASSED") && missingReceipts > 0) items.push({ id: `${meal.id}-receipts`, label: `${meal.name}: ${missingReceipts} khoa chưa xác nhận nhận suất`, detail: "Theo dõi đủ/thiếu trong giai đoạn phục vụ" }); return items; }) ?? [];
  return <AppShell user={user} adminNotifications={notifications} workflowStatus={<VoiceNotificationControl workspace="admin" scope={selected} events={voiceEvents}/>}><main className="management-page">{dayData ? <ManagementBoard data={dayData} dates={dates} initialMealTime={query.meal} role={user.role} liveClock={!clock.simulated}/> : <ErrorState title="Chưa tải được vận hành hôm nay" description="Không có dữ liệu nào được thay đổi."/>}</main></AppShell>;
}
