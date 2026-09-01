"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";

type Action = (data: FormData) => Promise<void>;
type DepartmentRow = { id: string; code: string; name: string; status: "ACTIVE" | "INACTIVE"; statusLabel: string };

export function DepartmentTable({ data, saveAction, statusAction }: { data: DepartmentRow[]; saveAction: Action; statusAction: Action }) {
  const t = getTranslations(readClientLocale()).management.adminTables;
  const columns: ColumnDef<DepartmentRow, unknown>[] = [
    { accessorKey: "code", header: t.departmentCode, cell: ({ row }) => <strong>{row.original.code}</strong> },
    { accessorKey: "name", header: t.departmentName },
    { accessorKey: "statusLabel", header: t.status },
    { id: "actions", header: t.actions, enableSorting: false, cell: ({ row }) => {
      const item = row.original;
      const reasonId = `department-reason-${item.id}`;
      return <Dialog><DialogTrigger asChild><button type="button" className="secondary-button">{t.edit}</button></DialogTrigger><DialogContent className="admin-dialog max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{t.editDepartment.replace("{name}", item.name)}</DialogTitle><DialogDescription>{t.editDepartmentDescription}</DialogDescription></DialogHeader><div className="admin-detail"><form action={saveAction} className="admin-grid"><input type="hidden" name="departmentId" value={item.id}/><label>{t.departmentCode}<input name="code" defaultValue={item.code} pattern="[A-Za-z0-9_-]{2,20}" required/></label><label>{t.departmentName}<input name="name" defaultValue={item.name} required/></label><button className="secondary-button">{t.saveChanges}</button></form><form action={statusAction} className="status-form"><input type="hidden" name="departmentId" value={item.id}/><input type="hidden" name="active" value={item.status === "ACTIVE" ? "false" : "true"}/><label className="sr-only" htmlFor={reasonId}>{t.statusReason}</label><input id={reasonId} name="reason" minLength={3} maxLength={500} required placeholder={t.requiredReason}/><button className={item.status === "ACTIVE" ? "danger-button" : "secondary-button"}>{item.status === "ACTIVE" ? t.deactivate : t.reactivate}</button></form></div></DialogContent></Dialog>;
    } },
  ];
  return <DataTable className="admin-data-table" columns={columns} data={data} getRowId={(row) => row.id} filterPlaceholder={t.departmentFilter} emptyMessage={t.noDepartments}/>;
}
