"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Language } from "@/lib/i18n";
import { adminText } from "./i18n";

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

const roleLabels = {
  ADMIN: "Quản trị",
  DIETITIAN: "Dinh dưỡng",
  NURSE: "Điều dưỡng",
  KITCHEN: "Nhà bếp",
} as const;

export function AccountTable({
  language,
  data,
  departments,
  saveAction,
  statusAction,
}: {
  language?: Language;
  data: AccountRow[];
  departments: Option[];
  saveAction: Action;
  statusAction: Action;
}) {
  const currentLanguage = language ?? "vi";
  const t = (text: string) => adminText(currentLanguage, text);
  const labels =
    currentLanguage === "en"
      ? { ADMIN: "Admin", DIETITIAN: "Dietitian", NURSE: "Nurse", KITCHEN: "Kitchen" }
      : roleLabels;

  const columns: ColumnDef<AccountRow, unknown>[] = [
    {
      accessorKey: "name",
      header: t("Họ tên"),
      cell: ({ row }) => <strong>{row.original.name}</strong>,
    },
    { accessorKey: "email", header: t("Email") },
    { accessorKey: "roleLabel", header: t("Vai trò") },
    { accessorKey: "department", header: t("Khoa") },
    { accessorKey: "kitchenScope", header: t("Phạm vi bếp") },
    { accessorKey: "statusLabel", header: t("Trạng thái") },
    {
      id: "actions",
      header: t("Thao tác"),
      enableSorting: false,
      cell: ({ row }) => {
        const account = row.original;
        const reasonId = `account-status-reason-${account.id}`;
        return (
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="secondary-button">
                {t("Sửa")}
              </button>
            </DialogTrigger>
            <DialogContent className="admin-dialog max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {currentLanguage === "en" ? `Edit account ${account.name}` : `Sửa tài khoản ${account.name}`}
                </DialogTitle>
                <DialogDescription>
                  {t("Cập nhật thông tin hoặc đổi trạng thái. Mọi thay đổi vẫn được ghi nhật ký.")}
                </DialogDescription>
              </DialogHeader>
              <div className="admin-detail">
                <form action={saveAction} className="admin-grid">
                  <input type="hidden" name="userId" value={account.id} />
                  <label>
                    {t("Họ tên")}
                    <input
                      name="displayName"
                      defaultValue={account.name}
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label>
                    {t("Email")}
                    <input
                      name="email"
                      type="email"
                      defaultValue={account.email}
                      autoComplete="email"
                      spellCheck={false}
                      required
                    />
                  </label>
                  <label>
                    {t("Vai trò")}
                    <select name="role" defaultValue={account.role}>
                      {Object.entries(labels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("Khoa")}
                    <select name="departmentId" defaultValue={account.departmentId}>
                      <option value="">—</option>
                      {departments.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("Phạm vi bếp")}
                    <select name="kitchenRoute" defaultValue={account.kitchenRoute}>
                      <option value="">—</option>
                      <option value="NORMAL">{t("Bếp ăn thường")}</option>
                      <option value="SONDE">{adminText(currentLanguage, "Bếp Sonde")}</option>
                    </select>
                  </label>
                  <label>
                    {t("Mật khẩu mới (để trống nếu giữ nguyên)")}
                    <input
                      name="password"
                      type="password"
                      minLength={10}
                      maxLength={256}
                      autoComplete="new-password"
                    />
                  </label>
                  <button className="secondary-button">{t("Lưu sửa đổi")}</button>
                </form>
                <form action={statusAction} className="status-form">
                  <input type="hidden" name="userId" value={account.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
                  />
                  <label className="sr-only" htmlFor={reasonId}>
                    {t("Lý do đổi trạng thái")}
                  </label>
                  <input
                    id={reasonId}
                    name="reason"
                    minLength={3}
                    maxLength={500}
                    autoComplete="off"
                    required
                    placeholder={t("Lý do bắt buộc")}
                  />
                  <button
                    className={
                      account.status === "ACTIVE"
                        ? "danger-button"
                        : "secondary-button"
                    }
                  >
                    {account.status === "ACTIVE"
                      ? t("Vô hiệu hóa")
                      : t("Kích hoạt lại")}
                  </button>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        );
      },
    },
  ];

  return (
    <DataTable
      className="admin-data-table"
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      filterPlaceholder={t("Lọc họ tên, email, khoa…")}
      emptyMessage={t("Chưa có tài khoản.")}
    />
  );
}
