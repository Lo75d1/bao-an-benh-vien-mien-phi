"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useActionState } from "react";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { INITIAL_ACTION_RESULT } from "@/lib/action-result";
import { handoffMealEventAction } from "./actions";

type HandoffRow = { departmentId: string; departmentName: string; quantity: number; handedOffAt: string | null; handedOffBy: string | null };

const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

export function KitchenHandoffControl({ eventId, rows }: { eventId: string; rows: HandoffRow[] }) {
  const [result, action, pending] = useActionState(handoffMealEventAction, INITIAL_ACTION_RESULT);
  const completed = rows.length > 0 && rows.every((row) => row.handedOffAt);
  return <section className="kitchen-handoff-card"><header><div><span>Bàn giao suất ăn</span><h3>Các khoa nhận suất</h3></div><b>{rows.filter((row) => row.handedOffAt).length}/{rows.length} khoa</b></header>
    <div className="kitchen-handoff-list">{rows.map((row) => <article key={row.departmentId}><div><strong>{row.departmentName}</strong><span>{row.quantity} suất</span></div>{row.handedOffAt ? <p className="is-complete"><CheckCircle2/> <span>Đã bàn giao<small>{time.format(new Date(row.handedOffAt))} · {row.handedOffBy ?? "—"}</small></span></p> : <p><span>Chưa bàn giao</span></p>}</article>)}</div>
    <form action={action}><input type="hidden" name="eventId" value={eventId}/><ActionFeedback result={result}/><ActionButton type="submit" className="primary-action" pending={pending} completed={completed} pendingLabel="Đang bàn giao…" completedLabel="Đã bàn giao cho các khoa" disabled={rows.length === 0}><Send/>Bàn giao cho khoa</ActionButton></form>
  </section>;
}
