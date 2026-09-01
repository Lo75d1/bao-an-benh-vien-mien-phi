"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useActionState } from "react";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { INITIAL_ACTION_RESULT } from "@/lib/action-result";
import { getTranslations, readClientLocale } from "@/lib/locale";
import { handoffMealEventAction } from "./actions";

type HandoffRow = { departmentId: string; departmentName: string; quantity: number; handedOffAt: string | null; handedOffBy: string | null };

export function KitchenHandoffControl({ eventId, rows }: { eventId: string; rows: HandoffRow[] }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management.kitchenHandoff;
  const time = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
  const [result, action, pending] = useActionState(handoffMealEventAction, INITIAL_ACTION_RESULT);
  const completed = rows.length > 0 && rows.every((row) => row.handedOffAt);
  return <section className="kitchen-handoff-card"><header><div><span>{t.eyebrow}</span><h3>{t.title}</h3></div><b>{t.wardCount.replace("{done}", String(rows.filter((row) => row.handedOffAt).length)).replace("{total}", String(rows.length))}</b></header>
    <div className="kitchen-handoff-list">{rows.map((row) => <article key={row.departmentId}><div><strong>{row.departmentName}</strong><span>{t.servingCount.replace("{count}", String(row.quantity))}</span></div>{row.handedOffAt ? <p className="is-complete"><CheckCircle2/> <span>{t.handedOff}<small>{time.format(new Date(row.handedOffAt))} · {row.handedOffBy ?? "-"}</small></span></p> : <p><span>{t.notHandedOff}</span></p>}</article>)}</div>
    <form action={action}><input type="hidden" name="eventId" value={eventId}/><ActionFeedback result={result}/><ActionButton type="submit" className="primary-action" pending={pending} completed={completed} pendingLabel={t.pending} completedLabel={t.completed} disabled={rows.length === 0}><Send/>{t.submit}</ActionButton></form>
  </section>;
}
