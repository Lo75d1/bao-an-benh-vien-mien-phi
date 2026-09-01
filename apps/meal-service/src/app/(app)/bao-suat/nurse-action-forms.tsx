"use client";

import { AlertTriangle, Check, Pencil, Utensils } from "lucide-react";
import { useActionState, useState } from "react";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { getTranslations, readClientLocale } from "@/lib/locale";

type Action = (previous: ActionResult, data: FormData) => Promise<ActionResult>;
type Receipt = { status: "FULL" | "SHORT"; expectedQuantity: number; receivedQuantity: number; note: string | null; confirmedAt: string; confirmedBy: string };
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

export function LateAdditionForm({ eventId, route, diets, action }: { eventId: string; route: "NORMAL" | "SONDE"; diets: Array<{ id: string; code: string; name: string }>; action: Action }) {
  const [result, formAction, pending] = useActionState(action, INITIAL_ACTION_RESULT);
  const [locale] = useState(() => readClientLocale());
  const t = getTranslations(locale).management.baoSuatForm;
  return <form action={formAction} className="nurse-late-addition-form">
    <input type="hidden" name="mealEventId" value={eventId}/><input type="hidden" name="route" value={route}/>
    <label>{t.dietTypeLabel}<select name="dietTypeId" required defaultValue=""><option value="" disabled>{t.dietTypePlaceholder}</option>{diets.map((diet) => <option key={diet.id} value={diet.id}>{diet.code} · {diet.name}</option>)}</select></label>
    <label>{t.quantityLabel}<input type="number" name="quantity" min="1" step="1" inputMode="numeric" required/></label>
    <label>{t.reasonLabel}<textarea name="reason" minLength={3} maxLength={500} required/></label>
    <ActionButton type="submit" className="primary-action" pending={pending} pendingLabel={t.pendingAddition} completed={result.status === "success"} completedLabel={t.completedAddition}>{t.sendAddition}</ActionButton>
    <ActionFeedback result={result}/>
  </form>;
}

function ReceiptForm({ eventId, route, expected, kind, previous, action }: { eventId: string; route: "NORMAL" | "SONDE"; expected: number; kind: "FULL" | "SHORT"; previous?: { status: "FULL" | "SHORT"; receivedQuantity: number; note: string | null } | null; action: Action }) {
  const [result, formAction, pending] = useActionState(action, INITIAL_ACTION_RESULT);
  const [locale] = useState(() => readClientLocale());
  const t = getTranslations(locale).management.baoSuatForm;
  return <form action={formAction} className={kind === "SHORT" ? "delivery-short-form" : undefined}>
    <input type="hidden" name="mealEventId" value={eventId}/><input type="hidden" name="route" value={route}/><input type="hidden" name="status" value={kind}/>
    {kind === "FULL" ? <input type="hidden" name="receivedQuantity" value={expected}/> : <><label>{t.receivedQuantityLabel}<input name="receivedQuantity" type="number" min="0" max={Math.max(0, expected - 1)} step="1" defaultValue={previous?.status === "SHORT" ? previous.receivedQuantity : ""} required/></label><label>{t.missingReasonLabel}<textarea name="note" minLength={3} maxLength={500} defaultValue={previous?.status === "SHORT" ? previous.note ?? "" : ""} required/></label></>}
    {previous ? <label>{t.correctionReasonLabel}<input name="correctionReason" minLength={3} maxLength={500} required placeholder={t.correctionReasonPlaceholder}/></label> : null}
    <ActionButton type="submit" className={kind === "FULL" ? "primary-action" : "secondary-button"} disabled={expected < 1} pending={pending} pendingLabel={t.receiptPendingLabel} completed={result.status === "success"} completedLabel={kind === "FULL" ? t.receiptFullStatus : t.receiptShortRecorded}>{kind === "FULL" ? <><Check/>{t.receiptFullSummary(expected)}</> : t.receiptShortConfirm}</ActionButton>
    <ActionFeedback result={result} actionId="delivery-receipt"/>
  </form>;
}

export function DeliveryReceiptForms({ eventId, route, expected, receipt, action }: { eventId: string; route: "NORMAL" | "SONDE"; expected: number; receipt: { status: "FULL" | "SHORT"; receivedQuantity: number; note: string | null } | null; action: Action }) {
  return <div className="delivery-receipt-actions"><ReceiptForm eventId={eventId} route={route} expected={expected} kind="FULL" previous={receipt} action={action}/><ReceiptForm eventId={eventId} route={route} expected={expected} kind="SHORT" previous={receipt} action={action}/></div>;
}

export function DeliveryHandoffWaiting({ eventName }: { eventName: string }) {
  const [locale] = useState(() => readClientLocale());
  const t = getTranslations(locale).management.baoSuatForm;
  return <section className="service-receipt-pending"><div><span>{t.handoffSectionTitle} · {eventName}</span><strong>{t.handoffWaitingLabel}</strong><small>{t.handoffWaitingDescription}</small></div></section>;
}

export function DeliveryReceiptControl({ eventId, eventName, route, expected, receipt, action }: { eventId: string; eventName: string; route: "NORMAL" | "SONDE"; expected: number; receipt: Receipt | null; action: Action }) {
  const [locale] = useState(() => readClientLocale());
  const t = getTranslations(locale).management.baoSuatForm;
  const missing = receipt ? Math.max(0, receipt.expectedQuantity - receipt.receivedQuantity) : 0;
  const formReceipt = receipt ? { status: receipt.status, receivedQuantity: receipt.receivedQuantity, note: receipt.note } : null;
  const dialog = <Dialog><DialogTrigger asChild>{receipt ? <button type="button" className="secondary-button receipt-edit"><Pencil/>{t.receiptEditButton}</button> : <button type="button" className="primary-action receipt-primary"><Utensils/>{t.receiptConfirmButton}</button>}</DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{receipt ? t.receiptEditTitle : t.receiptConfirmTitle} · {eventName}</DialogTitle><DialogDescription>{t.receiptDescriptionPrefix}{expected}{t.receiptDescriptionSuffix}{receipt ? " Mọi sửa đổi bắt buộc có lý do và được ghi AuditLog." : ""}</DialogDescription></DialogHeader><DeliveryReceiptForms eventId={eventId} route={route} expected={expected} receipt={formReceipt} action={action}/></DialogContent></Dialog>;
  if (!receipt) return <section className="service-receipt-pending"><div><span>{t.handoffSectionTitle}</span><strong>{t.handoffWaitingLabel}</strong><small>{t.handoffWaitingDescription}</small></div>{dialog}</section>;
  return <section className={receipt.status === "SHORT" ? "service-receipt-result is-short" : "service-receipt-result is-full"}><div className="service-receipt-icon">{receipt.status === "SHORT" ? <AlertTriangle/> : <Check/>}</div><div><strong>{receipt.status === "FULL" ? t.receiptFullSummary(receipt.receivedQuantity) : t.receiptShortSummary(receipt.receivedQuantity, missing)}</strong>{receipt.status === "SHORT" ? <p>{receipt.note}</p> : null}<small>{dateTime.format(new Date(receipt.confirmedAt))} · {receipt.confirmedBy}</small></div>{dialog}</section>;
}
