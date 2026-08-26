import { Check, MessageCircle, Plus, Utensils } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NurseMealProgress } from "@/components/nurse-meal-progress";
import { EmptyState } from "@/components/presentation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSessionUser } from "@/lib/auth";
import { MEAL_PHASE_LABEL, mealTimePhase, pickReportingMeal } from "@/lib/meal-events";
import { readPendingPatientNotes } from "@/lib/patient-note";
import { readNurseServingDay } from "@/lib/serving-report";
import { readRequestClock } from "@/lib/request-clock";
import { addLateMealAction, confirmDeliveryReceiptAction, reviewPatientNoteAction, saveServingReportAction } from "./actions";
import { ServingForm } from "./serving-form";
import { LivePhaseRefresh } from "@/components/live-phase-refresh";
import { PhaseTransitionNotice } from "@/components/phase-transition-notice";

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
  const routeSwitch = <Tabs value={data.route} className="nurse-route-switch"><TabsList aria-label="Chọn luồng báo suất"><TabsTrigger value="NORMAL" asChild><Link href="/bao-suat?route=NORMAL">Ăn thường</Link></TabsTrigger>{data.sondeEnabled ? <TabsTrigger value="SONDE" asChild><Link href="/bao-suat?route=SONDE">Qua Sonde</Link></TabsTrigger> : null}</TabsList></Tabs>;
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
  const acceptedAdditions = event?.additions.filter((item) => item.ackStatus === "RECEIVED" || item.ackStatus === "SUBSTITUTE").reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const expectedReceiptQuantity = (report?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0) + acceptedAdditions;
  const receipt = event?.deliveryReceipts[0];
  const lateAdditionTrigger = event ? <Dialog><DialogTrigger asChild><button type="button" className="primary-action"><Plus aria-hidden="true"/>Báo bổ sung</button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Báo bổ sung cho {event.mealType.name}</DialogTitle><DialogDescription>Nhập phần phát sinh cho đúng bữa đang xử lý.</DialogDescription></DialogHeader><form action={addLateMealAction} className="nurse-late-addition-form"><input type="hidden" name="mealEventId" value={event.id}/><input type="hidden" name="route" value={data.route}/><label>Mã chế độ ăn<select name="dietTypeId" required defaultValue=""><option value="" disabled>Chọn mã chế độ</option>{event.dietMeals.map((meal) => <option key={meal.dietTypeId} value={meal.dietTypeId}>{meal.dietType.code} · {meal.dietType.name}</option>)}</select></label><label>Số suất<input type="number" name="quantity" min="1" step="1" inputMode="numeric" required/></label><label>Lý do<textarea name="reason" minLength={3} maxLength={500} required/></label><button type="submit" className="primary-action">Gửi bổ sung cho bếp</button></form></DialogContent></Dialog> : null;
  const notesTrigger = <Dialog><DialogTrigger asChild><button type="button" className={pendingNotes.length ? "nurse-note-trigger has-notes" : "nurse-note-trigger"} aria-label={pendingNotes.length ? `${pendingNotes.length} ghi chú bệnh nhân chờ duyệt` : "Không có ghi chú bệnh nhân"}><MessageCircle aria-hidden="true"/>{pendingNotes.length ? <span>{pendingNotes.length}</span> : null}</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Ghi chú bệnh nhân</DialogTitle><DialogDescription>Chỉ ghi chú được duyệt mới chuyển sang góc ghi chú của bếp.</DialogDescription></DialogHeader>{pendingNotes.length ? <div className="nurse-note-dialog-list">{pendingNotes.map((note) => <article key={note.id}><div><strong>{note.note}</strong><small>{note.department.name} · {dateLabel.format(note.mealDate)}{note.contactName ? ` · ${note.contactName}` : ""}</small></div><form action={reviewPatientNoteAction}><input type="hidden" name="noteId" value={note.id}/><input type="hidden" name="route" value={data.route}/><input name="reviewNote" maxLength={100} placeholder="Lý do nếu từ chối"/><button className="secondary-button" name="status" value="REJECTED">Từ chối</button><button className="primary-action" name="status" value="APPROVED">Duyệt tới bếp</button></form></article>)}</div> : <p>— · Không có ghi chú chờ duyệt.</p>}</DialogContent></Dialog>;
  const deliveryReceiptTrigger = event && report && (currentPhase === "SERVING" || currentPhase === "PASSED") ? <Dialog><DialogTrigger asChild><button type="button" className={receipt?.status === "SHORT" ? "secondary-button receipt-short" : "secondary-button"}><Utensils/>{receipt ? receipt.status === "FULL" ? "Đã nhận đủ" : `Đã nhận ${receipt.receivedQuantity}/${receipt.expectedQuantity}` : "Xác nhận nhận suất"}</button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Xác nhận giao nhận · {event.mealType.name}</DialogTitle><DialogDescription>Dự kiến của khoa: {expectedReceiptQuantity} suất. Chọn nhanh nhận đủ; chỉ nhập chi tiết khi nhận thiếu.</DialogDescription></DialogHeader><div className="delivery-receipt-actions"><form action={confirmDeliveryReceiptAction}><input type="hidden" name="mealEventId" value={event.id}/><input type="hidden" name="route" value={data.route}/><input type="hidden" name="status" value="FULL"/><input type="hidden" name="receivedQuantity" value={expectedReceiptQuantity}/><button className="primary-action" disabled={expectedReceiptQuantity < 1}><Check/>Đã nhận đủ {expectedReceiptQuantity} suất</button></form><form action={confirmDeliveryReceiptAction} className="delivery-short-form"><input type="hidden" name="mealEventId" value={event.id}/><input type="hidden" name="route" value={data.route}/><input type="hidden" name="status" value="SHORT"/><label>Số suất thực nhận<input name="receivedQuantity" type="number" min="0" max={Math.max(0, expectedReceiptQuantity - 1)} step="1" defaultValue={receipt?.status === "SHORT" ? receipt.receivedQuantity : ""} required/></label><label>Lý do thiếu<textarea name="note" minLength={3} maxLength={500} defaultValue={receipt?.status === "SHORT" ? receipt.note ?? "" : ""} required/></label><button className="secondary-button" disabled={expectedReceiptQuantity < 1}>Xác nhận nhận thiếu</button></form></div></DialogContent></Dialog> : null;
  const lifecycleEvent = dayOver ? data.events[0] : currentEvent;
  const notifications = [...(pendingNotes.length ? [{ id: "patient-notes", label: `${pendingNotes.length} ghi chú chờ duyệt`, detail: "Cần duyệt trước khi chuyển tới bếp" }] : []), ...(event && report && (currentPhase === "SERVING" || currentPhase === "PASSED") && !receipt ? [{ id: "delivery-receipt", label: `${event.mealType.name}: chưa xác nhận nhận suất`, detail: "Xác nhận nhận đủ hoặc nhận thiếu" }] : [])];
  return <AppShell user={user} adminNotifications={notifications} demoClock={clock.enabled ? { nowIso: clock.now.toISOString(), simulated: clock.simulated } : undefined} workflowStatus={currentEvent && currentPhase ? <span><strong>{currentEvent.mealType.name}</strong> — {MEAL_PHASE_LABEL[currentPhase]}</span> : null}><main className="nurse-report-page">
    <LivePhaseRefresh enabled={!clock.simulated}/>
    {currentEvent && currentPhase ? <PhaseTransitionNotice scope={`nurse:${data.route}`} mealName={currentEvent.mealType.name} phase={currentPhase}/> : null}
    {saved ? <p className="success-banner" role="status">{saved === "receipt" ? "Đã lưu xác nhận giao nhận của khoa." : "Đã xác nhận bảng suất ăn và chuyển số liệu cho bếp."}</p> : null}
    {lifecycleEvent ? <NurseMealProgress mealName={lifecycleEvent.mealType.name} phase={dayOver ? null : currentPhase} cutoffTime={lifecycleEvent.mealType.cutoffTime} serviceTime={lifecycleEvent.mealType.serviceTime} routeSwitch={routeSwitch}/> : <section className="nurse-progress-empty">{routeSwitch}</section>}
    {!event ? <EmptyState icon={Utensils} title={`Chưa có ${data.route === "SONDE" ? "cữ Sonde" : "bữa ăn thường"} hôm nay`} description="Hệ thống không tự tạo hoặc đoán số suất."/> : <ServingForm route={data.route} mealEventId={event.id} departmentName={data.departmentName} submitted={!!report} submittedByName={report?.reportedByName ?? null} canEdit={canEdit} canAddLate={canAddLate} notesTrigger={notesTrigger} lateAdditionTrigger={lateAdditionTrigger} deliveryReceiptTrigger={deliveryReceiptTrigger} action={saveServingReportAction} lines={event.dietMeals.map((meal) => { const line = byDiet.get(meal.dietTypeId); const previousLine = previousByDiet.get(meal.dietTypeId); const initialQuantity = line?.quantity ?? previousLine?.quantity ?? 0; return { dietTypeId: meal.dietTypeId, name: `${meal.dietType.name} · ${meal.feedingRoute === "SONDE" ? "Qua sonde" : "Đường miệng"}`, code: meal.dietType.code, route: meal.feedingRoute, quantity: String(initialQuantity), previousQuantity: previousLine?.quantity ?? null, internalNote: line?.internalNote ?? "", patientVisibleNote: line?.patientVisibleNote ?? "", menuItems: menuItems(meal.menuSnapshotJson), criteria: criteria(meal.evaluationJson) }; })}/>}</main></AppShell>;
}
