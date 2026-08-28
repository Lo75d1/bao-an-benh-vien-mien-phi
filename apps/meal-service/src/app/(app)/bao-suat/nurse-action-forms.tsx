"use client";

import { AlertTriangle, Check, Pencil, Utensils } from "lucide-react";
import { useActionState } from "react";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";

type Action = (previous: ActionResult, data: FormData) => Promise<ActionResult>;
type Receipt = { status: "FULL" | "SHORT"; expectedQuantity: number; receivedQuantity: number; note: string | null; confirmedAt: string; confirmedBy: string };
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

export function LateAdditionForm({ eventId, route, diets, action }: { eventId: string; route: "NORMAL" | "SONDE"; diets: Array<{ id: string; code: string; name: string }>; action: Action }) {
  const [result, formAction, pending] = useActionState(action, INITIAL_ACTION_RESULT);
  return <form action={formAction} className="nurse-late-addition-form">
    <input type="hidden" name="mealEventId" value={eventId}/><input type="hidden" name="route" value={route}/>
    <label>Mã chế độ ăn<select name="dietTypeId" required defaultValue=""><option value="" disabled>Chọn mã chế độ</option>{diets.map((diet) => <option key={diet.id} value={diet.id}>{diet.code} · {diet.name}</option>)}</select></label>
    <label>Số suất<input type="number" name="quantity" min="1" step="1" inputMode="numeric" required/></label>
    <label>Lý do<textarea name="reason" minLength={3} maxLength={500} required/></label>
    <ActionButton type="submit" className="primary-action" pending={pending} pendingLabel="Đang gửi bổ sung…" completed={result.status === "success"} completedLabel="Đã gửi bổ sung">Gửi bổ sung cho bếp</ActionButton>
    <ActionFeedback result={result}/>
  </form>;
}

function ReceiptForm({ eventId, route, expected, kind, previous, action }: { eventId: string; route: "NORMAL" | "SONDE"; expected: number; kind: "FULL" | "SHORT"; previous?: { status: "FULL" | "SHORT"; receivedQuantity: number; note: string | null } | null; action: Action }) {
  const [result, formAction, pending] = useActionState(action, INITIAL_ACTION_RESULT);
  return <form action={formAction} className={kind === "SHORT" ? "delivery-short-form" : undefined}>
    <input type="hidden" name="mealEventId" value={eventId}/><input type="hidden" name="route" value={route}/><input type="hidden" name="status" value={kind}/>
    {kind === "FULL" ? <input type="hidden" name="receivedQuantity" value={expected}/> : <><label>Số suất thực nhận<input name="receivedQuantity" type="number" min="0" max={Math.max(0, expected - 1)} step="1" defaultValue={previous?.status === "SHORT" ? previous.receivedQuantity : ""} required/></label><label>Lý do thiếu<textarea name="note" minLength={3} maxLength={500} defaultValue={previous?.status === "SHORT" ? previous.note ?? "" : ""} required/></label></>}
    {previous ? <label>Lý do điều chỉnh xác nhận<input name="correctionReason" minLength={3} maxLength={500} required placeholder="Ví dụ: Khoa kiểm đếm lại số suất"/></label> : null}
    <ActionButton type="submit" className={kind === "FULL" ? "primary-action" : "secondary-button"} disabled={expected < 1} pending={pending} pendingLabel="Đang xác nhận…" completed={result.status === "success"} completedLabel={kind === "FULL" ? "Đã nhận đủ" : "Đã ghi nhận nhận thiếu"}>{kind === "FULL" ? <><Check/>Đã nhận đủ {expected} suất</> : "Xác nhận nhận thiếu"}</ActionButton>
    <ActionFeedback result={result}/>
  </form>;
}

export function DeliveryReceiptForms({ eventId, route, expected, receipt, action }: { eventId: string; route: "NORMAL" | "SONDE"; expected: number; receipt: { status: "FULL" | "SHORT"; receivedQuantity: number; note: string | null } | null; action: Action }) {
  return <div className="delivery-receipt-actions"><ReceiptForm eventId={eventId} route={route} expected={expected} kind="FULL" previous={receipt} action={action}/><ReceiptForm eventId={eventId} route={route} expected={expected} kind="SHORT" previous={receipt} action={action}/></div>;
}

export function DeliveryReceiptControl({ eventId, eventName, route, expected, receipt, action }: { eventId: string; eventName: string; route: "NORMAL" | "SONDE"; expected: number; receipt: Receipt | null; action: Action }) {
  const missing = receipt ? Math.max(0, receipt.expectedQuantity - receipt.receivedQuantity) : 0;
  const formReceipt = receipt ? { status: receipt.status, receivedQuantity: receipt.receivedQuantity, note: receipt.note } : null;
  const dialog = <Dialog><DialogTrigger asChild>{receipt ? <button type="button" className="secondary-button receipt-edit"><Pencil/>Sửa xác nhận</button> : <button type="button" className="primary-action receipt-primary"><Utensils/>Xác nhận giao nhận</button>}</DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{receipt ? "Sửa xác nhận giao nhận" : "Xác nhận giao nhận"} · {eventName}</DialogTitle><DialogDescription>Dự kiến của khoa: {expected} suất. Chọn nhanh nhận đủ; chỉ nhập chi tiết khi nhận thiếu.{receipt ? " Mọi sửa đổi bắt buộc có lý do và được ghi AuditLog." : ""}</DialogDescription></DialogHeader><DeliveryReceiptForms eventId={eventId} route={route} expected={expected} receipt={formReceipt} action={action}/></DialogContent></Dialog>;
  if (!receipt) return <section className="service-receipt-pending"><div><span>Nhiệm vụ chính</span><strong>Chưa xác nhận nhận suất</strong><small>Xác nhận ngay khi khoa nhận suất từ bếp.</small></div>{dialog}</section>;
  return <section className={receipt.status === "SHORT" ? "service-receipt-result is-short" : "service-receipt-result is-full"}><div className="service-receipt-icon">{receipt.status === "SHORT" ? <AlertTriangle/> : <Check/>}</div><div><strong>{receipt.status === "FULL" ? `Đã nhận đủ ${receipt.receivedQuantity}/${receipt.expectedQuantity} suất` : `Nhận thiếu ${receipt.receivedQuantity}/${receipt.expectedQuantity} suất · thiếu ${missing}`}</strong>{receipt.status === "SHORT" ? <p>{receipt.note}</p> : null}<small>{dateTime.format(new Date(receipt.confirmedAt))} · {receipt.confirmedBy}</small></div>{dialog}</section>;
}
