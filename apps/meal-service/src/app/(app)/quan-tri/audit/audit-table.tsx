"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { getTranslations, readClientLocale } from "@/lib/locale";

export type AuditRow = { id: string; createdAt: string; actorName: string; action: string; entityType: string; entityId: string; reason: string; before: string; after: string };

export function AuditTable({ data }: { data: AuditRow[] }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management.auditLog;
  const dateTime = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" });
  const columns: ColumnDef<AuditRow, unknown>[] = [
    { accessorKey: "createdAt", header: t.time, cell: ({ row }) => <time dateTime={row.original.createdAt} className="tabular-nums">{dateTime.format(new Date(row.original.createdAt))}</time> },
    { accessorKey: "actorName", header: t.actor, cell: ({ getValue }) => String(getValue() || "-") },
    { accessorKey: "action", header: t.action, cell: ({ getValue }) => String(getValue() || "-") },
    { accessorKey: "entityType", header: t.entity, cell: ({ row }) => <code className="break-words text-xs">{row.original.entityType || "-"}:{row.original.entityId || "-"}</code> },
    { accessorKey: "reason", header: t.reason, cell: ({ getValue }) => <span className="block max-w-72 whitespace-normal break-words">{String(getValue() || "-")}</span> },
    { id: "detail", header: t.beforeAfter, enableSorting: false, cell: ({ row }) => <details className="min-w-52"><summary className="min-h-11 cursor-pointer py-3 font-medium text-accent focus-visible:ring-2 focus-visible:ring-ring">{t.viewDetail}</summary><div className="grid gap-3 pb-3"><section><h2 className="text-xs font-semibold text-muted-foreground">{t.before}</h2><pre className="mt-1 max-h-56 max-w-lg overflow-auto whitespace-pre-wrap break-words rounded-md bg-secondary p-3 text-xs">{row.original.before}</pre></section><section><h2 className="text-xs font-semibold text-muted-foreground">{t.after}</h2><pre className="mt-1 max-h-56 max-w-lg overflow-auto whitespace-pre-wrap break-words rounded-md bg-secondary p-3 text-xs">{row.original.after}</pre></section></div></details> },
  ];
  return <DataTable className="admin-data-table audit-data-table" columns={columns} data={data} getRowId={(row) => row.id} filterPlaceholder={t.filterPlaceholder} emptyMessage={t.emptyMessage} pageSize={10} />;
}
