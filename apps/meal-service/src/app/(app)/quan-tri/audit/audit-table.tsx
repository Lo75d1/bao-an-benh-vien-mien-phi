"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { Language } from "@/lib/i18n";
export type AuditRow = { id: string; createdAt: string; actorName: string; action: string; entityType: string; entityId: string; reason: string; before: string; after: string };
export function AuditTable({ data, language }: { data: AuditRow[]; language: Language }) {
 const en = language === "en"; const dateTime = new Intl.DateTimeFormat(en ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" });
 const columns: ColumnDef<AuditRow, unknown>[] = [
  { accessorKey: "createdAt", header: en ? "Time" : "Thời điểm", cell: ({ row }) => <time dateTime={row.original.createdAt} className="tabular-nums">{dateTime.format(new Date(row.original.createdAt))}</time> },
  { accessorKey: "actorName", header: en ? "Performed by" : "Người thực hiện", cell: ({ getValue }) => String(getValue() || "—") },
  { accessorKey: "action", header: en ? "Action" : "Thao tác", cell: ({ getValue }) => String(getValue() || "—") },
  { accessorKey: "entityType", header: en ? "Entity" : "Đối tượng", cell: ({ row }) => <code className="break-words text-xs">{row.original.entityType || "—"}:{row.original.entityId || "—"}</code> },
  { accessorKey: "reason", header: en ? "Reason" : "Lý do", cell: ({ getValue }) => <span className="block max-w-72 whitespace-normal break-words">{String(getValue() || "—")}</span> },
  { id: "detail", header: en ? "Before / after" : "Trước / sau", enableSorting: false, cell: ({ row }) => <details className="min-w-52"><summary className="min-h-11 cursor-pointer py-3 font-medium text-accent focus-visible:ring-2 focus-visible:ring-ring">{en ? "View details" : "Xem chi tiết"}</summary><div className="grid gap-3 pb-3"><section><h2 className="text-xs font-semibold text-muted-foreground">{en ? "Before" : "Trước"}</h2><pre className="mt-1 max-h-56 max-w-lg overflow-auto whitespace-pre-wrap break-words rounded-md bg-secondary p-3 text-xs">{row.original.before}</pre></section><section><h2 className="text-xs font-semibold text-muted-foreground">{en ? "After" : "Sau"}</h2><pre className="mt-1 max-h-56 max-w-lg overflow-auto whitespace-pre-wrap break-words rounded-md bg-secondary p-3 text-xs">{row.original.after}</pre></section></div></details> },
 ];
 return <DataTable className="admin-data-table audit-data-table" columns={columns} data={data} getRowId={(row) => row.id} filterPlaceholder={en ? "Filter by person, action, or entity…" : "Lọc người, thao tác, đối tượng…"} emptyMessage={en ? "No audit entries yet." : "Chưa có nhật ký thao tác."} pageSize={10} />;
}
