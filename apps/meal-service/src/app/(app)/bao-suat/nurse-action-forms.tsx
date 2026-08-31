"use client";

import { AlertTriangle, Check, Pencil, Utensils } from "lucide-react";
import { useActionState } from "react";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import type { Language } from "@/lib/i18n";

const TEXT = {
  vi: {
    dietCode: "Mã chế độ ăn",
    chooseCode: "Chọn mã chế độ",
    servings: "Số suất",
    reason: "Lý do",
    sendAddition: "Gửi bổ sung cho bếp",
    sending: "Đang gửi bổ sung…",
    sentAddition: "Đã gửi bổ sung",
    correctionReason: "Lý do điều chỉnh xác nhận",
    exampleCorrection: "Ví dụ: Khoa kiểm đếm lại số suất",
    confirming: "Đang xác nhận…",
    receivedFull: "Đã nhận đủ",
    receivedShort: "Đã ghi nhận nhận thiếu",
    confirmShort: "Xác nhận nhận thiếu",
    handoff: "Giao nhận",
    waitingHandoff: "Chờ Bếp bàn giao",
    waitingDesc: "Số suất dự kiến và nút xác nhận đủ/thiếu sẽ hiện sau khi Bếp bàn giao cho khoa.",
    mainTask: "Nhiệm vụ chính",
    notConfirmed: "Chưa xác nhận nhận suất",
    confirmNow: "Xác nhận ngay khi khoa nhận suất từ bếp.",
    editReceipt: "Sửa xác nhận",
    confirmReceipt: "Xác nhận giao nhận",
    editReceiptTitle: "Sửa xác nhận giao nhận",
    confirmReceiptTitle: "Xác nhận giao nhận",
    expected: "Dự kiến của khoa",
    fullReceived: (received: number, expected: number) => `Đã nhận đủ ${received}/${expected} suất`,
    shortReceived: (received: number, expected: number, missing: number) => `Nhận thiếu ${received}/${expected} suất · thiếu ${missing}`,
    noDifference: "Không có chênh lệch.",
  },
  en: {
    dietCode: "Diet code",
    chooseCode: "Select a diet code",
    servings: "Servings",
    reason: "Reason",
    sendAddition: "Send addition to kitchen",
    sending: "Sending addition…",
    sentAddition: "Addition sent",
    correctionReason: "Reason for correction",
    exampleCorrection: "Example: Department re-counted the servings",
    confirming: "Confirming…",
    receivedFull: "Received in full",
    receivedShort: "Short receipt logged",
    confirmShort: "Confirm short receipt",
    handoff: "Handoff",
    waitingHandoff: "Waiting for kitchen handoff",
    waitingDesc: "Expected servings and full/short confirmation will appear after the kitchen hands off to the department.",
    mainTask: "Main task",
    notConfirmed: "Receipt not yet confirmed",
    confirmNow: "Confirm as soon as the department receives the meal.",
    editReceipt: "Edit receipt",
    confirmReceipt: "Confirm receipt",
    editReceiptTitle: "Edit receipt confirmation",
    confirmReceiptTitle: "Confirm receipt",
    expected: "Department expectation",
    fullReceived: (received: number, expected: number) => `Received in full ${received}/${expected}`,
    shortReceived: (received: number, expected: number, missing: number) => `Short receipt ${received}/${expected} · missing ${missing}`,
    noDifference: "No difference.",
  },
} as const;

type Action = (previous: ActionResult, data: FormData) => Promise<ActionResult>;
type Receipt = { status: "FULL" | "SHORT"; expectedQuantity: number; receivedQuantity: number; note: string | null; confirmedAt: string; confirmedBy: string };
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

export function LateAdditionForm({ eventId, route, diets, action, language = "vi" }: { eventId: string; route: "NORMAL" | "SONDE"; diets: Array<{ id: string; code: string; name: string }>; action: Action; language?: Language }) {
  const t = TEXT[language];
  const [result, formAction, pending] = useActionState(action, INITIAL_ACTION_RESULT);
  return <form action={formAction} className="nurse-late-addition-form" onSubmit={(event) => event.stopPropagation()}>
    <input type="hidden" name="mealEventId" value={eventId}/><input type="hidden" name="route" value={route}/>
    <label>{t.dietCode}<select name="dietTypeId" required defaultValue=""><option value="" disabled>{t.chooseCode}</option>{diets.map((diet) => <option key={diet.id} value={diet.id}>{diet.code} · {diet.name}</option>)}</select></label>
    <label>{t.servings}<input type="number" name="quantity" min="1" step="1" inputMode="numeric" required/></label>
    <label>{t.reason}<textarea name="reason" minLength={3} maxLength={500} required/></label>
    <ActionButton type="submit" className="primary-action" pending={pending} pendingLabel={t.sending} completed={result.status === "success"} completedLabel={t.sentAddition}>{t.sendAddition}</ActionButton>
    <ActionFeedback result={result}/>
  </form>;
}

function ReceiptForm({ eventId, route, expected, kind, previous, action, language = "vi" }: { eventId: string; route: "NORMAL" | "SONDE"; expected: number; kind: "FULL" | "SHORT"; previous?: { status: "FULL" | "SHORT"; receivedQuantity: number; note: string | null } | null; action: Action; language?: Language }) {
  const t = TEXT[language];
  const [result, formAction, pending] = useActionState(action, INITIAL_ACTION_RESULT);
  return <form action={formAction} className={kind === "SHORT" ? "delivery-short-form" : undefined} onSubmit={(event) => event.stopPropagation()}>
    <input type="hidden" name="mealEventId" value={eventId}/><input type="hidden" name="route" value={route}/><input type="hidden" name="status" value={kind}/>
    {kind === "FULL" ? <input type="hidden" name="receivedQuantity" value={expected}/> : <><label>Số suất thực nhận<input name="receivedQuantity" type="number" min="0" max={Math.max(0, expected - 1)} step="1" defaultValue={previous?.status === "SHORT" ? previous.receivedQuantity : ""} required/></label><label>Lý do thiếu<textarea name="note" minLength={3} maxLength={500} defaultValue={previous?.status === "SHORT" ? previous.note ?? "" : ""} required/></label></>}
    {previous ? <label>{t.correctionReason}<input name="correctionReason" minLength={3} maxLength={500} required placeholder={t.exampleCorrection}/></label> : null}
    <ActionButton type="submit" className={kind === "FULL" ? "primary-action" : "secondary-button"} disabled={expected < 1} pending={pending} pendingLabel={t.confirming} completed={result.status === "success"} completedLabel={kind === "FULL" ? t.receivedFull : t.receivedShort}>{kind === "FULL" ? <><Check/>{t.receivedFull} {expected}</> : t.confirmShort}</ActionButton>
    <ActionFeedback result={result}/>
  </form>;
}

export function DeliveryReceiptForms({ eventId, route, expected, receipt, action, language = "vi" }: { eventId: string; route: "NORMAL" | "SONDE"; expected: number; receipt: { status: "FULL" | "SHORT"; receivedQuantity: number; note: string | null } | null; action: Action; language?: Language }) {
  return <div className="delivery-receipt-actions"><ReceiptForm eventId={eventId} route={route} expected={expected} kind="FULL" previous={receipt} action={action} language={language}/><ReceiptForm eventId={eventId} route={route} expected={expected} kind="SHORT" previous={receipt} action={action} language={language}/></div>;
}

export function DeliveryHandoffWaiting({ eventName, language = "vi" }: { eventName: string; language?: Language }) {
  const t = TEXT[language];
  return <section className="service-receipt-pending"><div><span>{t.handoff} · {eventName}</span><strong>{t.waitingHandoff}</strong><small>{t.waitingDesc}</small></div></section>;
}

export function DeliveryReceiptControl({ eventId, eventName, route, expected, receipt, action, language = "vi" }: { eventId: string; eventName: string; route: "NORMAL" | "SONDE"; expected: number; receipt: Receipt | null; action: Action; language?: Language }) {
  const t = TEXT[language];
  const missing = receipt ? Math.max(0, receipt.expectedQuantity - receipt.receivedQuantity) : 0;
  const formReceipt = receipt ? { status: receipt.status, receivedQuantity: receipt.receivedQuantity, note: receipt.note } : null;
  const dialog = <Dialog><DialogTrigger asChild>{receipt ? <button type="button" className="secondary-button receipt-edit"><Pencil/>{t.editReceipt}</button> : <button type="button" className="primary-action receipt-primary"><Utensils/>{t.confirmReceipt}</button>}</DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{receipt ? t.editReceiptTitle : t.confirmReceiptTitle} · {eventName}</DialogTitle><DialogDescription>{t.expected}: {expected} suất. Chọn nhanh nhận đủ; chỉ nhập chi tiết khi nhận thiếu.{receipt ? " Mọi sửa đổi bắt buộc có lý do và được ghi AuditLog." : ""}</DialogDescription></DialogHeader><DeliveryReceiptForms eventId={eventId} route={route} expected={expected} receipt={formReceipt} action={action} language={language}/></DialogContent></Dialog>;
  if (!receipt) return <section className="service-receipt-pending"><div><span>{t.mainTask}</span><strong>{t.notConfirmed}</strong><small>{t.confirmNow}</small></div>{dialog}</section>;
  return <section className={receipt.status === "SHORT" ? "service-receipt-result is-short" : "service-receipt-result is-full"}><div className="service-receipt-icon">{receipt.status === "SHORT" ? <AlertTriangle/> : <Check/>}</div><div><strong>{receipt.status === "FULL" ? t.fullReceived(receipt.receivedQuantity, receipt.expectedQuantity) : t.shortReceived(receipt.receivedQuantity, receipt.expectedQuantity, missing)}</strong>{receipt.status === "SHORT" ? <p>{receipt.note}</p> : null}<small>{dateTime.format(new Date(receipt.confirmedAt))} · {receipt.confirmedBy}</small></div>{dialog}</section>;
}
