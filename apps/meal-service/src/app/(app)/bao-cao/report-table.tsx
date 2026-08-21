"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
type ReportColumn = { key: string; label: string };
export function ReportTable({ columns: source, rows }: { columns: ReportColumn[]; rows: Record<string, unknown>[] }) {
 const columns: ColumnDef<Record<string, unknown>, unknown>[] = source.map((column) => ({ accessorKey: column.key, header: column.label, cell: ({ getValue }) => { const value = getValue(); return value === null || value === undefined || value === "" ? "—" : String(value); }, meta: { numeric: /quantity|total|price|amount|count/i.test(column.key) } }));
 return <DataTable columns={columns} data={rows} filterPlaceholder="Lọc nhanh báo cáo…" emptyMessage="Chưa có dữ liệu trong khoảng đã chọn." pageSize={15}/>;
}
