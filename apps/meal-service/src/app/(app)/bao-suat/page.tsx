import { MessageCircle, Plus, Utensils } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NurseMealProgress } from "@/components/nurse-meal-progress";
import { EmptyState } from "@/components/presentation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getSessionUser } from "@/lib/auth";
import { currentNurseWorkflow, NURSE_PHASE_LABEL } from "@/lib/nurse-workflow";
import { readPendingPatientNotes } from "@/lib/patient-note";
import { readNurseServingDay } from "@/lib/serving-report";
import { addLateMealAction, reviewPatientNoteAction, saveServingReportAction } from "./actions";
import { ServingForm } from "./serving-form";

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

function menuItems(value: unknown) {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return [];
  return value.items.flatMap((entry) => { if (!entry || typeof entry !== "object") return []; const row = entry as Record<string, unknown>; if (typeof row.itemName !== "string") return []; return [{ name: row.itemName, dishName: typeof row.dishName === "string" ? row.dishName : "Món 1", grams: typeof row.grams === "number" ? row.grams : null }]; });
}

function criteria(value: unknown) {
  if (!value || typeof value !== "object" || !("criteria" in value) || !Array.isArray(value.criteria)) return [];
  return value.criteria.flatMap((entry) => { if (!entry || typeof entry !== "object") return []; const row = entry as Record<string, unknown>; if (typeof row.label !== "string") return []; return [{ label: row.label, status: typeof row.status === "string" ? row.status : "MISSING", actual: typeof row.actual === "number" ? row.actual : null, target: typeof row.target === "string" ? row.target : "—" }]; });
}

export default async function ServingReportPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getSessionUser(); if (!user) redirect("/"); if (user.role !== "NURSE") redirect("/");
  const [{ saved }, data, pendingNotes] = await Promise.all([searchParams, readNurseServingDay(user.id), readPendingPatientNotes(user.id)]);
  const workflowMeals = data.events.map((event) => ({ id: event.id, name: event.mealType.name, mealDate: event.mealDate.toISOString().slice(0, 10), cutoffTime: event.mealType.cutoffTime, serviceTime: event.mealType.serviceTime }));
  const workflow = currentNurseWorkflow(workflowMeals, data.serviceCompletionMinutes);
  const selectedIndex = Math.max(0, data.events.findIndex((event) => event.id === workflow?.meal.id));
  const event = data.events[selectedIndex];
  const previous = selectedIndex > 0 ? data.events[selectedIndex - 1] : null;
  const report = event?.reports[0]; const previousReport = previous?.reports[0];
  const byDiet = new Map(report?.lines.map((line) => [line.dietTypeId, line]));
  const previousByDiet = new Map(previousReport?.lines.map((line) => [line.dietTypeId, line]));
  const canAddLate = workflow?.phase !== "REPORTING";
  const editable = workflow?.phase === "REPORTING" && !report;
  const lateAdditionTrigger = event ? <Dialog><DialogTrigger asChild><button type="button" className="primary-action"><Plus aria-hidden="true"/>Báo bổ sung</button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Báo bổ sung cho {event.mealType.name}</DialogTitle><DialogDescription>Nhập phần phát sinh cho đúng bữa đang xử lý.</DialogDescription></DialogHeader><form action={addLateMealAction} className="nurse-late-addition-form"><input type="hidden" name="mealEventId" value={event.id}/><label>Mã chế độ ăn<select name="dietTypeId" required defaultValue=""><option value="" disabled>Chọn mã chế độ</option>{event.dietMeals.map((meal) => <option key={meal.dietTypeId} value={meal.dietTypeId}>{meal.dietType.code} · {meal.dietType.name}</option>)}</select></label><label>Số suất<input type="number" name="quantity" min="1" step="1" inputMode="numeric" required/></label><label>Lý do<textarea name="reason" minLength={3} maxLength={500} required/></label><button type="submit" className="primary-action">Gửi bổ sung cho bếp</button></form></DialogContent></Dialog> : null;
  const notesTrigger = <Dialog><DialogTrigger asChild><button type="button" className={pendingNotes.length ? "nurse-note-trigger has-notes" : "nurse-note-trigger"} aria-label={pendingNotes.length ? `${pendingNotes.length} ghi chú bệnh nhân chờ duyệt` : "Không có ghi chú bệnh nhân"}><MessageCircle aria-hidden="true"/>{pendingNotes.length ? <span>{pendingNotes.length}</span> : null}</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Ghi chú bệnh nhân</DialogTitle><DialogDescription>Chỉ ghi chú được duyệt mới chuyển sang góc ghi chú của bếp.</DialogDescription></DialogHeader>{pendingNotes.length ? <div className="nurse-note-dialog-list">{pendingNotes.map((note) => <article key={note.id}><div><strong>{note.note}</strong><small>{note.department.name} · {dateLabel.format(note.mealDate)}{note.contactName ? ` · ${note.contactName}` : ""}</small></div><form action={reviewPatientNoteAction}><input type="hidden" name="noteId" value={note.id}/><input name="reviewNote" maxLength={100} placeholder="Lý do nếu từ chối"/><button className="secondary-button" name="status" value="REJECTED">Từ chối</button><button className="primary-action" name="status" value="APPROVED">Duyệt tới bếp</button></form></article>)}</div> : <p>— · Không có ghi chú chờ duyệt.</p>}</DialogContent></Dialog>;
  return <AppShell user={user} workflowStatus={workflow ? <span><strong>{workflow.meal.name}</strong> — {NURSE_PHASE_LABEL[workflow.phase]}</span> : null}><main className="nurse-report-page">
    {saved ? <p className="success-banner" role="status">Đã xác nhận bảng suất ăn và chuyển số liệu cho bếp.</p> : null}
    <NurseMealProgress meals={workflowMeals} completionMinutes={data.serviceCompletionMinutes}/>
    {!event ? <EmptyState icon={Utensils} title="Chưa có bữa ăn hôm nay" description="Hệ thống không tự tạo hoặc đoán số suất."/> : <ServingForm mealEventId={event.id} departmentName={data.departmentName} editable={editable} submittedByName={report?.reportedByName ?? null} canAddLate={canAddLate} notesTrigger={notesTrigger} lateAdditionTrigger={lateAdditionTrigger} action={saveServingReportAction} lines={event.dietMeals.map((meal) => { const line = byDiet.get(meal.dietTypeId); const previousLine = previousByDiet.get(meal.dietTypeId); const initialQuantity = line?.quantity ?? previousLine?.quantity ?? 0; return { dietTypeId: meal.dietTypeId, name: meal.dietType.name, code: meal.dietType.code, route: meal.feedingRoute, quantity: String(initialQuantity), previousQuantity: previousLine?.quantity ?? null, internalNote: line?.internalNote ?? "", patientVisibleNote: line?.patientVisibleNote ?? "", menuItems: menuItems(meal.menuSnapshotJson), criteria: criteria(meal.evaluationJson) }; })}/>}</main></AppShell>;
}
