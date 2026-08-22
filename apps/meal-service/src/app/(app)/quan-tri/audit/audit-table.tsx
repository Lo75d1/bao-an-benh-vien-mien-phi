"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";

export type AuditRow = { id: string; createdAt: string; actorName: string; action: string; entityType: string; entityId: string; reason: string; before: string; after: string };

const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" });
const columns: ColumnDef<AuditRow, unknown>[] = [
  { accessorKey: "createdAt", header: "Thời điểm", cell: ({ row }) => <time dateTime={row.original.createdAt} className="tabular-nums">{dateTime.format(new Date(row.original.createdAt))}</time> },
  { accessorKey: "actorName", header: "Người thực hiện", cell: ({ getValue }) => String(getValue() || "—") },
  { accessorKey: "action", header: "Thao tác", cell: ({ getValue }) => String(getValue() || "—") },
  { accessorKey: "entityType", header: "Đối tượng", cell: ({ row }) => <code className="break-words text-xs">{row.original.entityType || "—"}:{row.original.entityId || "—"}</code> },
  { accessorKey: "reason", header: "Lý do", cell: ({ getValue }) => <span className="block max-w-72 whitespace-normal break-words">{String(getValue() || "—")}</span> },
  { id: "detail", header: "Trước / sau", enableSorting: false, cell: ({ row }) => <details className="min-w-52"><summary className="min-h-11 cursor-pointer py-3 font-medium text-accent focus-visible:ring-2 focus-visible:ring-ring">Xem chi tiết</summary><div className="grid gap-3 pb-3"><section><h2 className="text-xs font-semibold text-muted-foreground">Trước</h2><pre className="mt-1 max-h-56 max-w-lg overflow-auto whitespace-pre-wrap break-words rounded-md bg-secondary p-3 text-xs">{row.original.before}</pre></section><section><h2 className="text-xs font-semibold text-muted-foreground">Sau</h2><pre className="mt-1 max-h-56 max-w-lg overflow-auto whitespace-pre-wrap break-words rounded-md bg-secondary p-3 text-xs">{row.original.after}</pre></section></div></details> },
];

export function AuditTable({ data }: { data: AuditRow[] }) { return <DataTable className="admin-data-table audit-data-table" columns={columns} data={data} getRowId={(row) => row.id} filterPlaceholder="Lọc người, thao tác, đối tượng…" emptyMessage="Chưa có nhật ký thao tác." pageSize={10} />; }
