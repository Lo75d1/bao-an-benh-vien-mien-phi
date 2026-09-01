"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/i18n";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterPlaceholder?: string;
  emptyMessage?: string;
  pageSize?: number;
  getRowId?: (row: TData) => string;
  className?: string;
  language?: Language;
};

export function DataTable<TData, TValue>({ columns, data, filterPlaceholder, emptyMessage, pageSize = 10, getRowId, className, language = "vi" }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  // TanStack Table intentionally returns stateful callbacks; React Compiler skips this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
    initialState: { pagination: { pageSize } },
  });
  const filteredCount = table.getFilteredRowModel().rows.length;

  return <div className={cn("grid gap-3", className)}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block w-full sm:max-w-sm">
        <span className="sr-only">{language === "en" ? "Quick table filter" : "Lọc nhanh bảng"}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} className="h-11 pl-9" placeholder={filterPlaceholder ?? (language === "en" ? "Quick filter…" : "Lọc nhanh…")} autoComplete="off" />
      </label>
      <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">{filteredCount ? `${filteredCount} ${language === "en" ? (filteredCount === 1 ? "row" : "rows") : "dòng"}` : "—"}</p>
    </div>
    <div className="max-w-full overflow-x-auto rounded-xl border border-border bg-background">
      <Table className="min-w-[760px]">
        <TableHeader className="sticky top-0 z-10 bg-secondary/95 backdrop-blur-sm">
          {table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => {
            const numeric = header.column.columnDef.meta?.numeric;
            return <TableHead key={header.id} className={cn(numeric && "text-right tabular-nums")}>
              {header.isPlaceholder ? null : header.column.getCanSort() ? <button type="button" className={cn("inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-left hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", numeric && "w-full justify-end")} onClick={header.column.getToggleSortingHandler()} aria-label={`${language === "en" ? "Sort by" : "Sắp xếp theo"} ${String(header.column.columnDef.header)}`}>
                {flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getIsSorted() === "asc" ? <ArrowUp aria-hidden="true" className="size-3.5" /> : header.column.getIsSorted() === "desc" ? <ArrowDown aria-hidden="true" className="size-3.5" /> : <ChevronsUpDown aria-hidden="true" className="size-3.5 opacity-50" />}
              </button> : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>;
          })}</TableRow>)}
        </TableHeader>
        <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={cn(cell.column.columnDef.meta?.numeric && "text-right tabular-nums")}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">—<span className="ml-2">{emptyMessage ?? (language === "en" ? "No data available." : "Chưa có dữ liệu.")}</span></TableCell></TableRow>}</TableBody>
      </Table>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm tabular-nums text-muted-foreground">{language === "en" ? "Page" : "Trang"} {table.getPageCount() ? table.getState().pagination.pageIndex + 1 : 0}/{table.getPageCount()}</p>
      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>{language === "en" ? "Previous page" : "Trang trước"}</Button><Button type="button" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>{language === "en" ? "Next page" : "Trang sau"}</Button></div>
    </div>
  </div>;
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> { numeric?: boolean }
}
