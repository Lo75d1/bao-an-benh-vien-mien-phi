"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";

type Action = (data: FormData) => Promise<void>;
export type MealTypeRow = { id: string; code: string; name: string; cutoffTime: string; serviceTime: string; feedingRoute: "NORMAL" | "SONDE"; routeLabel: string; sortOrder: number; status: "ACTIVE" | "INACTIVE"; statusLabel: string };

export function MealTypeTable({ data, saveAction, statusAction }: { data: MealTypeRow[]; saveAction: Action; statusAction: Action }) {
  const t = getTranslations(readClientLocale()).management.adminTables;
  const columns: ColumnDef<MealTypeRow, unknown>[] = [
    { accessorKey: "code", header: t.code, cell: ({ row }) => <strong>{row.original.code}</strong> },
    { accessorKey: "name", header: t.mealName },
    { accessorKey: "routeLabel", header: t.schedule },
    { accessorKey: "cutoffTime", header: t.cutoffTime },
    { accessorKey: "serviceTime", header: t.serviceTime },
    { accessorKey: "sortOrder", header: t.sortOrder, meta: { numeric: true } },
    { accessorKey: "statusLabel", header: t.status },
    { id: "actions", header: t.actions, enableSorting: false, cell: ({ row }) => {
      const meal = row.original;
      const reasonId = `meal-status-reason-${meal.id}`;
      return <Dialog><DialogTrigger asChild><button type="button" className="secondary-button">{t.edit}</button></DialogTrigger><DialogContent className="admin-dialog max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{t.editMeal.replace("{name}", meal.name)}</DialogTitle><DialogDescription>{t.editMealDescription}</DialogDescription></DialogHeader><div className="admin-detail"><form action={saveAction} className="admin-grid"><input type="hidden" name="mealTypeId" value={meal.id}/><label>{t.code}<input name="code" defaultValue={meal.code} autoComplete="off" spellCheck={false} required/></label><label>{t.mealName}<input name="name" defaultValue={meal.name} autoComplete="off" required/></label><label>{t.scheduleType}<select name="feedingRoute" defaultValue={meal.feedingRoute}><option value="NORMAL">{t.normalSchedule}</option><option value="SONDE">{t.sondeSchedule}</option></select></label><label>{t.cutoffTime}<input name="cutoffTime" type="time" defaultValue={meal.cutoffTime} required/></label><label>{t.serviceTime}<input name="serviceTime" type="time" defaultValue={meal.serviceTime} required/></label><label>{t.sortOrder}<input name="sortOrder" type="number" min="0" max="999" defaultValue={meal.sortOrder} required/></label><button className="secondary-button">{t.saveChanges}</button></form><form action={statusAction} className="status-form"><input type="hidden" name="mealTypeId" value={meal.id}/><input type="hidden" name="active" value={meal.status === "ACTIVE" ? "false" : "true"}/><label className="sr-only" htmlFor={reasonId}>{t.statusReason}</label><input id={reasonId} name="reason" minLength={3} maxLength={500} autoComplete="off" required placeholder={t.requiredReason}/><button className={meal.status === "ACTIVE" ? "danger-button" : "secondary-button"}>{meal.status === "ACTIVE" ? t.deactivate : t.reactivate}</button></form></div></DialogContent></Dialog>;
    } },
  ];
  return <DataTable className="admin-data-table" columns={columns} data={data} getRowId={(row) => row.id} filterPlaceholder={t.mealFilter} emptyMessage={t.noMeals}/>;
}
