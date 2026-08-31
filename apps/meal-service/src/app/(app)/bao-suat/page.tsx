import { MessageCircle, Plus, Utensils } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NurseMealProgress } from "@/components/nurse-meal-progress";
import { EmptyState } from "@/components/presentation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSessionUser } from "@/lib/auth";
import { deliveryReceiptAvailability } from "@/lib/delivery-receipt";
import { hospitalDayKey, MEAL_PHASE_LABEL, mealTimePhase, pickReportingMeal } from "@/lib/meal-events";
import { readPendingPatientNotes } from "@/lib/patient-note";
import { readNurseServingDay } from "@/lib/serving-report";
import { readRequestClock } from "@/lib/request-clock";
import { addLateMealAction, confirmDeliveryReceiptAction, reviewPatientNoteAction, saveServingReportAction } from "./actions";
import { ServingForm } from "./serving-form";
import { DeliveryHandoffWaiting, DeliveryReceiptControl, LateAdditionForm } from "./nurse-action-forms";
import { LivePhaseRefresh } from "@/components/live-phase-refresh";
import { PhaseTransitionNotice } from "@/components/phase-transition-notice";
import { VoiceNotificationControl } from "@/components/voice-notification-control";
import type { Language } from "@/lib/i18n";

const TEXT = {
  vi: {
    route: "Chọn luồng báo suất",
    normal: "Ăn thường",
    sonde: "Qua Sonde",
    lateAddition: "Báo bổ sung",
    lateAdditionTitle: "Báo bổ sung cho",
    lateAdditionDesc: "Nhập phần phát sinh cho đúng bữa đang xử lý.",
    pendingNotes: "Ghi chú bệnh nhân",
    pendingNotesEmpty: "— · Không có ghi chú chờ xác nhận.",
    confirmTransfer: "Xác nhận chuyển bếp",
    reject: "Từ chối",
    reason: "Lý do nếu từ chối",
    sentFull: "Đã lưu xác nhận giao nhận của khoa.",
    sentReport: "Đã xác nhận bảng suất ăn và chuyển số liệu cho bếp.",
    noMeal: "Chưa có cữ Sonde" as const,
    noMealOral: "Chưa có bữa ăn thường",
    noData: "Hệ thống không tự tạo hoặc đoán số suất.",
    pending: "ghi chú chờ xác nhận",
    handoffWait: "chờ Bếp bàn giao",
    handoffDetail: "Khoa sẽ xác nhận đủ hoặc thiếu sau khi Bếp bàn giao",
    receiptWait: "chưa xác nhận nhận suất",
    receiptDetail: "Xác nhận nhận đủ hoặc nhận thiếu",
  },
  en: {
    route: "Select reporting route",
    normal: "Oral meals",
    sonde: "Tube feeding",
    lateAddition: "Add late item",
    lateAdditionTitle: "Add late item for",
    lateAdditionDesc: "Enter the incident for the meal currently being handled.",
    pendingNotes: "Patient notes",
    pendingNotesEmpty: "— · No pending notes.",
    confirmTransfer: "Confirm handoff to kitchen",
    reject: "Reject",
    reason: "Reason if rejected",
    sentFull: "Department receipt saved.",
    sentReport: "Meal counts confirmed and sent to the kitchen.",
    noMeal: "No tube-feeding meal today" as const,
    noMealOral: "No oral meal today",
    noData: "The system does not create or guess counts.",
    pending: "notes awaiting confirmation",
    handoffWait: "waiting for kitchen handoff",
    handoffDetail: "The department will confirm full or short receipt after the kitchen handoff",
    receiptWait: "receipt not yet confirmed",
    receiptDetail: "Confirm full receipt or short receipt",
  },
} as const;

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

function menuItems(value: unknown) {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return [];
  return value.items.flatMap((entry) => { if (!entry || typeof entry !== "object") return []; const row = entry as Record<string, unknown>; if (typeof row.itemName !== "string") return []; return [{ name: row.itemName, dishName: typeof row.dishName === "string" ? row.dishName : "Món 1", grams: typeof row.grams === "number" ? row.grams : null }]; });
}

function criteria(value: unknown) {
  if (!value || typeof value !== "object" || !("criteria" in value) || !Array.isArray(value.criteria)) return [];
  return value.criteria.flatMap((entry) => { if (!entry || typeof entry !== "object") return []; const row = entry as Record<string, unknown>; if (typeof row.label !== "string") return []; return [{ label: row.label, status: typeof row.status === "string" ? row.status : "MISSING", actual: typeof row.actual === "number" ? row.actual : null, target: typeof row.target === "string" ? row.target : "—" }]; });
}

export default async function ServingReportPage({ searchParams }: { searchParams: Promise<{ saved?: string; route?: string }> }) {
  const user = await getSessionUser(); if (!user) redirect("/"); if (user.role !== "NURSE") redirect("/");
  const params = await searchParams;
  const requestedRoute = params.route === "SONDE" ? "SONDE" : "NORMAL";
  const clock = await readRequestClock();
  const [data, pendingNotes] = await Promise.all([readNurseServingDay(user.id, requestedRoute, clock.now), readPendingPatientNotes(user.id)]);
  const { saved } = params;
  const t = TEXT[user.language];
  const routeSwitch = <Tabs value={data.route} className="nurse-route-switch"><TabsList aria-label={t.route}><TabsTrigger value="NORMAL" asChild><Link href="/bao-suat?route=NORMAL">{t.normal}</Link></TabsTrigger>{data.sondeEnabled ? <TabsTrigger value="SONDE" asChild><Link href="/bao-suat?route=SONDE">{t.sonde}</Link></TabsTrigger> : null}</TabsList></Tabs>;
  // Mốc giờ lấy từ nguồn sự thật duy nhất (lib/meal-events) — dùng chung với bếp, lịch và admin.
  const phaseOf = (event: (typeof data.events)[number]) => mealTimePhase(event.mealDate, event.mealType.cutoffTime, event.mealType.serviceTime, clock.now, data.serviceCompletionMinutes);
  const currentEvent = pickReportingMeal(data.events.map((event) => ({ ...event, cutoffTime: event.mealType.cutoffTime, serviceTime: event.mealType.serviceTime })), clock.now, data.serviceCompletionMinutes);
  const currentPhase = currentEvent ? phaseOf(currentEvent) : null;
  const dayOver = !currentEvent || currentPhase === "PASSED";
  const selectedIndex = Math.max(0, data.events.findIndex((event) => event.id === currentEvent?.id));
  const event = data.events[selectedIndex];
  const previous = selectedIndex > 0 ? data.events[selectedIndex - 1] : null;
  const report = event?.reports[0]; const previousReport = previous?.reports[0];
  const byDiet = new Map(report?.lines.map((line) => [line.dietTypeId, line]));
  const previousByDiet = new Map(previousReport?.lines.map((line) => [line.dietTypeId, line]));
  const canEdit = currentPhase === "BEFORE_CUTOFF";
  const canAddLate = currentPhase === "PREPARING" || currentPhase === "SERVING" || currentPhase === "PASSED";
  const handoff = event?.mealHandoffs[0];
  const receipt = event?.deliveryReceipts[0];
  const receiptAvailability = deliveryReceiptAvailability(handoff, receipt);
  const lateAdditionTrigger = event ? <Dialog><DialogTrigger asChild><button type="button" className="primary-action"><Plus aria-hidden="true"/>{t.lateAddition}</button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{t.lateAdditionTitle} {event.mealType.name}</DialogTitle><DialogDescription>{t.lateAdditionDesc}</DialogDescription></DialogHeader><LateAdditionForm eventId={event.id} route={data.route} diets={event.dietMeals.map((meal) => ({ id: meal.dietTypeId, code: meal.dietType.code, name: meal.dietType.name }))} action={addLateMealAction} language={user.language}/></DialogContent></Dialog> : null;
  const notesTrigger = <Dialog><DialogTrigger asChild><button type="button" className={pendingNotes.length ? "nurse-note-trigger has-notes" : "nurse-note-trigger"} aria-label={pendingNotes.length ? `${pendingNotes.length} ${t.pendingNotes}` : t.pendingNotes}><MessageCircle aria-hidden="true"/>{pendingNotes.length ? <span>{pendingNotes.length}</span> : null}</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{t.pendingNotes}</DialogTitle><DialogDescription>Chỉ ghi chú được xác nhận mới chuyển sang góc ghi chú của bếp.</DialogDescription></DialogHeader>{pendingNotes.length ? <div className="nurse-note-dialog-list">{pendingNotes.map((note) => <article key={note.id}><div><strong>{note.note}</strong><small>{note.department.name} · {dateLabel.format(note.mealDate)}{note.contactName ? ` · ${note.contactName}` : ""}</small></div><form action={reviewPatientNoteAction} onSubmit={(event) => event.stopPropagation()}><input type="hidden" name="noteId" value={note.id}/><input type="hidden" name="route" value={data.route}/><input name="reviewNote" maxLength={100} placeholder={t.reason}/><button className="secondary-button" name="status" value="REJECTED">{t.reject}</button><button className="primary-action" name="status" value="APPROVED">{t.confirmTransfer}</button></form></article>)}</div> : <p>{t.pendingNotesEmpty}</p>}</DialogContent></Dialog>;
  const deliveryReceiptTrigger = event && report && (currentPhase === "SERVING" || currentPhase === "PASSED") ? receiptAvailability.status === "WAITING_HANDOFF" ? <DeliveryHandoffWaiting eventName={event.mealType.name}/> : <DeliveryReceiptControl eventId={event.id} eventName={event.mealType.name} route={data.route} expected={receiptAvailability.expectedQuantity} receipt={receipt ? { status: receipt.status, expectedQuantity: receipt.expectedQuantity, receivedQuantity: receipt.receivedQuantity, note: receipt.note, confirmedAt: receipt.confirmedAt.toISOString(), confirmedBy: receipt.confirmedBy.displayName } : null} action={confirmDeliveryReceiptAction}/> : null;
  const lifecycleEvent = dayOver ? data.events[0] : currentEvent;
  const notifications = [...(pendingNotes.length ? [{ id: "patient-notes", label: `${pendingNotes.length} ${t.pending}`, detail: "Cần xác nhận trước khi chuyển tới bếp" }] : []), ...(event && report && (currentPhase === "SERVING" || currentPhase === "PASSED") && !receipt ? receiptAvailability.status === "WAITING_HANDOFF" ? [{ id: "delivery-handoff", label: `${event.mealType.name}: ${t.handoffWait}`, detail: t.handoffDetail }] : [{ id: "delivery-receipt", label: `${event.mealType.name}: ${t.receiptWait}`, detail: t.receiptDetail }] : [])];
  const voiceEvents = [
    ...(currentEvent && currentPhase === "BEFORE_CUTOFF" ? [{ key: `phase:${hospitalDayKey(currentEvent.mealDate)}:${currentEvent.id}:${data.route}:${data.departmentId}:BEFORE_CUTOFF`, message: "Đã đến thời gian báo suất ăn. Vui lòng kiểm tra và gửi báo suất.", announceOnEnable: true }] : []),
    ...(event && handoff ? [{ key: `handoff:${hospitalDayKey(event.mealDate)}:${event.id}:${data.route}:${data.departmentId}`, message: "Bếp đã bàn giao suất ăn. Vui lòng kiểm tra và xác nhận số lượng." }] : []),
  ];
  const voiceControl = <VoiceNotificationControl workspace="nurse" scope={`${data.departmentId}:${data.route}`} events={voiceEvents}/>;
  return <AppShell user={user} adminNotifications={notifications} workflowStatus={<div className="workspace-voice-status">{currentEvent && currentPhase ? <span><strong>{currentEvent.mealType.name}</strong> — {MEAL_PHASE_LABEL[currentPhase]}</span> : null}{voiceControl}</div>}><main className="nurse-report-page">
    <LivePhaseRefresh enabled={!clock.simulated}/>
    {currentEvent && currentPhase ? <PhaseTransitionNotice scope={`nurse:${data.route}`} mealName={currentEvent.mealType.name} phase={currentPhase}/> : null}
    {saved ? <p className="success-banner" role="status">{saved === "receipt" ? t.sentFull : t.sentReport}</p> : null}
    {lifecycleEvent ? <NurseMealProgress mealName={lifecycleEvent.mealType.name} phase={dayOver ? null : currentPhase} cutoffTime={lifecycleEvent.mealType.cutoffTime} serviceTime={lifecycleEvent.mealType.serviceTime} routeSwitch={routeSwitch}/> : <section className="nurse-progress-empty">{routeSwitch}</section>}
    {!event ? <EmptyState icon={Utensils} title={data.route === "SONDE" ? t.noMeal : t.noMealOral} description={t.noData}/> : <ServingForm route={data.route} mealEventId={event.id} departmentName={data.departmentName} submitted={!!report} submittedByName={report?.reportedByName ?? null} canEdit={canEdit} canAddLate={canAddLate} notesTrigger={notesTrigger} lateAdditionTrigger={lateAdditionTrigger} deliveryReceiptTrigger={deliveryReceiptTrigger} action={saveServingReportAction} lines={event.dietMeals.map((meal) => { const line = byDiet.get(meal.dietTypeId); const previousLine = previousByDiet.get(meal.dietTypeId); const initialQuantity = line?.quantity ?? previousLine?.quantity ?? 0; return { dietTypeId: meal.dietTypeId, name: `${meal.dietType.name} · ${meal.feedingRoute === "SONDE" ? "Qua sonde" : "Đường miệng"}`, code: meal.dietType.code, route: meal.feedingRoute, quantity: String(initialQuantity), previousQuantity: previousLine?.quantity ?? null, internalNote: line?.internalNote ?? "", patientVisibleNote: line?.patientVisibleNote ?? "", menuItems: menuItems(meal.menuSnapshotJson), criteria: criteria(meal.evaluationJson) }; })} language={user.language}/>}</main></AppShell>;
}
