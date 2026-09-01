"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";

type Action = (data: FormData) => Promise<void>;
type Option = { id: string; name: string };
export type AccountRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DIETITIAN" | "NURSE" | "KITCHEN";
  roleLabel: string;
  departmentId: string;
  department: string;
  kitchenRoute: "NORMAL" | "SONDE" | "";
  kitchenScope: string;
  status: "ACTIVE" | "INACTIVE";
  statusLabel: string;
};

export function AccountTable({ data, departments, saveAction, statusAction }: { data: AccountRow[]; departments: Option[]; saveAction: Action; statusAction: Action }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management.adminTables;
  const roleLabels = getTranslations(locale).role;
  const columns: ColumnDef<AccountRow, unknown>[] = [
    { accessorKey: "name", header: t.fullName, cell: ({ row }) => <strong>{row.original.name}</strong> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "roleLabel", header: t.role },
    { accessorKey: "department", header: t.department },
    { accessorKey: "kitchenScope", header: t.kitchenScope },
    { accessorKey: "statusLabel", header: t.status },
    {
      id: "actions",
      header: t.actions,
      enableSorting: false,
      cell: ({ row }) => {
        const account = row.original;
        const reasonId = `account-status-reason-${account.id}`;
        return (
          <Dialog>
            <DialogTrigger asChild><button type="button" className="secondary-button">{t.edit}</button></DialogTrigger>
            <DialogContent className="admin-dialog max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t.editAccount.replace("{name}", account.name)}</DialogTitle>
                <DialogDescription>{t.editAccountDescription}</DialogDescription>
              </DialogHeader>
              <div className="admin-detail">
                <form action={saveAction} className="admin-grid">
                  <input type="hidden" name="userId" value={account.id} />
                  <label>{t.fullName}<input name="displayName" defaultValue={account.name} autoComplete="name" required /></label>
                  <label>Email<input name="email" type="email" defaultValue={account.email} autoComplete="email" spellCheck={false} required /></label>
                  <label>{t.role}<select name="role" defaultValue={account.role}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label>{t.department}<select name="departmentId" defaultValue={account.departmentId}><option value="">-</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label>{t.kitchenScope}<select name="kitchenRoute" defaultValue={account.kitchenRoute}><option value="">-</option><option value="NORMAL">{t.normalKitchen}</option><option value="SONDE">{t.sondeKitchen}</option></select></label>
                  <label>{t.newPasswordOptional}<input name="password" type="password" minLength={10} maxLength={256} autoComplete="new-password" /></label>
                  <button className="secondary-button">{t.saveChanges}</button>
                </form>
                <form action={statusAction} className="status-form">
                  <input type="hidden" name="userId" value={account.id} />
                  <input type="hidden" name="status" value={account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} />
                  <label className="sr-only" htmlFor={reasonId}>{t.statusReason}</label>
                  <input id={reasonId} name="reason" minLength={3} maxLength={500} autoComplete="off" required placeholder={t.requiredReason} />
                  <button className={account.status === "ACTIVE" ? "danger-button" : "secondary-button"}>{account.status === "ACTIVE" ? t.deactivate : t.reactivate}</button>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        );
      },
    },
  ];
  return <DataTable className="admin-data-table" columns={columns} data={data} getRowId={(row) => row.id} filterPlaceholder={t.accountFilter} emptyMessage={t.noAccounts} />;
}
