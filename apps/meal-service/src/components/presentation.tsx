import type { ReactNode } from "react";
import { AlertCircle, Inbox, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { acknowledgementLabel, mealStatusLabel } from "@/lib/presentation";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return <header className="page-heading ui-page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-header-actions">{actions}</div>}</header>;
}

const statusTone = { PLANNED: "planned", LOCKED: "locked", PREPARING: "preparing", PREPARED: "prepared", SERVED: "served", CANCELLED: "cancelled" } as const;
export function StatusBadge({ status }: { status: keyof typeof mealStatusLabel }) {
  return <Badge variant="outline" className={`status-badge status-${statusTone[status]}`}>{mealStatusLabel[status]}</Badge>;
}

export function AckBadge({ status }: { status: keyof typeof acknowledgementLabel }) {
  return <Badge variant="outline" className={`status-badge ack-${status.toLowerCase()}`}>{acknowledgementLabel[status]}</Badge>;
}

export function EvaluationBadge({ status }: { status: "OK" | "LOW" | "HIGH" | "MISSING" }) {
  const label = { OK: "Đạt", LOW: "Thiếu", HIGH: "Vượt", MISSING: "—" }[status];
  return <Badge variant="outline" className={`status-badge evaluation-${status.toLowerCase()}`}>{label}</Badge>;
}

export function DietName({ name, code }: { name: string; code?: string | null }) {
  if (!code) return <span>{name}</span>;
  return <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="diet-name" tabIndex={0}>{name}</span></TooltipTrigger><TooltipContent>Mã chế độ: {code}</TooltipContent></Tooltip></TooltipProvider>;
}

export function EmptyState({ title, description, icon: Icon = Inbox, compact = false }: { title: string; description: string; icon?: LucideIcon; compact?: boolean }) {
  return <Card className={cn("empty-state-ui", compact && "empty-state-compact")}><CardContent><Icon aria-hidden="true"/><div><strong>{title}</strong><span>—</span><p>{description}</p></div></CardContent></Card>;
}

export function ErrorState({ title = "Chưa thể tải nội dung", description = "Vui lòng thử lại sau." }: { title?: string; description?: string }) {
  return <Card className="error-state-ui" role="alert"><CardContent><AlertCircle aria-hidden="true"/><div><strong>{title}</strong><p>{description}</p></div></CardContent></Card>;
}
