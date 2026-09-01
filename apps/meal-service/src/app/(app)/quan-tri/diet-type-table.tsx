"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";

type Action = (data: FormData) => Promise<void>;
type DietCode = { id: string; code: string; name: string };
export type DietTypeRow = { id: string; code: string; name: string; feedingRoute: "NORMAL" | "SONDE"; routeLabel: string; dietCodeRefId: string; dietCode: string; sortOrder: number; status: "ACTIVE" | "INACTIVE"; statusLabel: string };

export function DietTypeTable({ data, dietCodes, saveAction, statusAction }: { data: DietTypeRow[]; dietCodes: DietCode[]; saveAction: Action; statusAction: Action }) {
  const t = getTranslations(readClientLocale()).management.adminTables;
  const columns: ColumnDef<DietTypeRow, unknown>[] = [
    { accessorKey: "code", header: t.code, cell: ({ row }) => <strong>{row.original.code}</strong> },
    { accessorKey: "name", header: t.dietName },
    { accessorKey: "routeLabel", header: t.feedingRoute },
    { accessorKey: "dietCode", header: t.regulation },
    { accessorKey: "sortOrder", header: t.sortOrder, meta: { numeric: true } },
    { accessorKey: "statusLabel", header: t.status },
    { id: "actions", header: t.actions, enableSorting: false, cell: ({ row }) => {
      const diet = row.original;
      const reasonId = `diet-status-reason-${diet.id}`;
      return <Dialog><DialogTrigger asChild><button type="button" className="secondary-button">{t.edit}</button></DialogTrigger><DialogContent className="admin-dialog max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{t.editDiet.replace("{code}", diet.code)}</DialogTitle><DialogDescription>{t.editDietDescription}</DialogDescription></DialogHeader><div className="admin-detail"><form action={saveAction} className="admin-grid"><input type="hidden" name="dietTypeId" value={diet.id}/><label>{t.code}<input name="code" defaultValue={diet.code} autoComplete="off" spellCheck={false} required/></label><label>{t.name}<input name="name" defaultValue={diet.name} autoComplete="off" required/></label><label>{t.feedingRoute}<select name="feedingRoute" defaultValue={diet.feedingRoute}><option value="NORMAL">{t.normalRoute}</option><option value="SONDE">Sonde</option></select></label><label>{t.regulation}<select name="dietCodeRefId" defaultValue={diet.dietCodeRefId}><option value="">-</option>{dietCodes.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></label><label>{t.sortOrder}<input name="sortOrder" type="number" min="0" max="999" defaultValue={diet.sortOrder}/></label><button className="secondary-button">{t.saveChanges}</button></form><form action={statusAction} className="status-form"><input type="hidden" name="dietTypeId" value={diet.id}/><input type="hidden" name="active" value={diet.status === "ACTIVE" ? "false" : "true"}/><label className="sr-only" htmlFor={reasonId}>{t.statusReason}</label><input id={reasonId} name="reason" minLength={3} maxLength={500} autoComplete="off" required placeholder={t.requiredReason}/><button className={diet.status === "ACTIVE" ? "danger-button" : "secondary-button"}>{diet.status === "ACTIVE" ? t.deactivate : t.reactivate}</button></form></div></DialogContent></Dialog>;
    } },
  ];
  return <DataTable className="admin-data-table" columns={columns} data={data} getRowId={(row) => row.id} filterPlaceholder={t.dietFilter} emptyMessage={t.noDiets}/>;
}
