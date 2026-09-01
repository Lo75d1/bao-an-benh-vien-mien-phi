import type { ReactNode } from "react";
import { AlertCircle, Inbox, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { acknowledgementLabel, mealStatusLabel } from "@/lib/presentation";
import type { Language } from "@/lib/i18n";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return <header className="page-heading ui-page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-header-actions">{actions}</div>}</header>;
}

export function ContextMetrics({ items, label, language = "vi" }: { items: Array<{ label: string; value: ReactNode; detail?: ReactNode }>; label?: string; language?: Language }) {
  return <dl aria-label={label ?? (language === "en" ? "Work summary" : "Tóm tắt công việc")} className="mb-5 grid overflow-hidden rounded-lg border border-border bg-secondary/60 sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-border">{items.map((item) => <div key={item.label} className="grid min-w-0 gap-0.5 border-b border-border px-4 py-2.5 last:border-b-0 sm:border-b-0"><dt className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">{item.label}</dt><dd className="truncate text-base font-semibold tabular-nums text-primary">{item.value}</dd>{item.detail && <dd className="text-xs text-muted-foreground">{item.detail}</dd>}</div>)}</dl>;
}

const statusTone = { PLANNED: "planned", LOCKED: "locked", PREPARING: "preparing", PREPARED: "prepared", SERVED: "served", CANCELLED: "cancelled" } as const;
export function StatusBadge({ status }: { status: keyof typeof mealStatusLabel }) {
  return <Badge variant="outline" className={`status-badge status-${statusTone[status]}`}>{mealStatusLabel[status]}</Badge>;
}

export function AckBadge({ status }: { status: keyof typeof acknowledgementLabel }) {
  return <Badge variant="outline" className={`status-badge ack-${status.toLowerCase()}`}>{acknowledgementLabel[status]}</Badge>;
}

export function EvaluationBadge({ status, language = "vi" }: { status: "OK" | "LOW" | "HIGH" | "MISSING"; language?: Language }) {
  const label = language === "en" ? { OK: "Meets", LOW: "Low", HIGH: "High", MISSING: "—" }[status] : { OK: "Đạt", LOW: "Thiếu", HIGH: "Vượt", MISSING: "—" }[status];
  return <Badge variant="outline" className={`status-badge evaluation-${status.toLowerCase()}`}>{label}</Badge>;
}

export function DietName({ name, code, language = "vi" }: { name: string; code?: string | null; language?: Language }) {
  if (!code) return <span>{name}</span>;
  return <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="diet-name" tabIndex={0}>{name}</span></TooltipTrigger><TooltipContent>{language === "en" ? "Diet code" : "Mã chế độ"}: {code}</TooltipContent></Tooltip></TooltipProvider>;
}

export function EmptyState({ title, description, icon: Icon = Inbox, compact = false }: { title: string; description: string; icon?: LucideIcon; compact?: boolean }) {
  return <Card className={cn("empty-state-ui", compact && "empty-state-compact")}><CardContent><Icon aria-hidden="true"/><div><strong>{title}</strong><span>—</span><p>{description}</p></div></CardContent></Card>;
}

export function ErrorState({ title, description, language = "vi" }: { title?: string; description?: string; language?: Language }) {
  return <Card className="error-state-ui" role="alert"><CardContent><AlertCircle aria-hidden="true"/><div><strong>{title ?? (language === "en" ? "Unable to load content" : "Chưa thể tải nội dung")}</strong><p>{description ?? (language === "en" ? "Please try again later." : "Vui lòng thử lại sau.")}</p></div></CardContent></Card>;
}
