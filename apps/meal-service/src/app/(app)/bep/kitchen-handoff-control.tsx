"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useActionState } from "react";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { INITIAL_ACTION_RESULT } from "@/lib/action-result";
import { handoffMealEventAction } from "./actions";
import type { Language } from "@/lib/i18n";

type HandoffRow = { departmentId: string; departmentName: string; quantity: number; handedOffAt: string | null; handedOffBy: string | null };

const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

export function KitchenHandoffControl({ eventId, rows, language = "vi" }: { eventId: string; rows: HandoffRow[]; language?: Language }) {
  const en = language === "en";
  const [result, action, pending] = useActionState(handoffMealEventAction, INITIAL_ACTION_RESULT);
  const completed = rows.length > 0 && rows.every((row) => row.handedOffAt);
  return <section className="kitchen-handoff-card"><header><div><span>{en ? "Meal handoff" : "Bàn giao suất ăn"}</span><h3>{en ? "Receiving departments" : "Các khoa nhận suất"}</h3></div><b>{rows.filter((row) => row.handedOffAt).length}/{rows.length} {en ? "departments" : "khoa"}</b></header>
    <div className="kitchen-handoff-list">{rows.map((row) => <article key={row.departmentId}><div><strong>{row.departmentName}</strong><span>{row.quantity} {en ? "servings" : "suất"}</span></div>{row.handedOffAt ? <p className="is-complete"><CheckCircle2/> <span>{en ? "Handed off" : "Đã bàn giao"}<small>{time.format(new Date(row.handedOffAt))} · {row.handedOffBy ?? "—"}</small></span></p> : <p><span>{en ? "Not handed off" : "Chưa bàn giao"}</span></p>}</article>)}</div>
    <form action={action}><input type="hidden" name="eventId" value={eventId}/><ActionFeedback result={result}/><ActionButton type="submit" className="primary-action" pending={pending} completed={completed} pendingLabel={en ? "Handing off…" : "Đang bàn giao…"} completedLabel={en ? "Handed off to departments" : "Đã bàn giao cho các khoa"} disabled={rows.length === 0}><Send/>{en ? "Hand off to departments" : "Bàn giao cho khoa"}</ActionButton></form>
  </section>;
}
