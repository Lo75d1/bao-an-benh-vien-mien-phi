"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Action = (data: FormData) => Promise<void>;
type DepartmentRow = { id: string; code: string; name: string; status: "ACTIVE" | "INACTIVE"; statusLabel: string; publicUrl: string | null };

export function DepartmentTable({ data, saveAction, statusAction }: { data: DepartmentRow[]; saveAction: Action; statusAction: Action }) {
  const columns: ColumnDef<DepartmentRow, unknown>[] = [
    { accessorKey: "code", header: "Mã khoa", cell: ({ row }) => <strong>{row.original.code}</strong> },
    { accessorKey: "name", header: "Tên khoa" },
    { accessorKey: "statusLabel", header: "Trạng thái" },
    {
      id: "actions",
      header: "Thao tác",
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Dialog>
            <DialogTrigger asChild><button type="button" className="secondary-button">Sửa</button></DialogTrigger>
            <DialogContent className="admin-dialog max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Sửa {item.name}</DialogTitle>
                <DialogDescription>Cập nhật tên, mã hoặc trạng thái mà không xóa lịch sử báo suất.</DialogDescription>
              </DialogHeader>
              <div className="admin-detail">
                <form action={saveAction} className="admin-grid">
                  <input type="hidden" name="departmentId" value={item.id} />
                  <label>Mã khoa<input name="code" defaultValue={item.code} pattern="[A-Za-z0-9_-]{2,20}" required /></label>
                  <label>Tên khoa<input name="name" defaultValue={item.name} required /></label>
                  <button className="secondary-button">Lưu sửa đổi</button>
                </form>
                <form action={statusAction} className="status-form">
                  <input type="hidden" name="departmentId" value={item.id} />
                  <input type="hidden" name="active" value={item.status === "ACTIVE" ? "false" : "true"} />
                  <label className="sr-only" htmlFor={`department-reason-${item.id}`}>Lý do đổi trạng thái</label>
                  <input id={`department-reason-${item.id}`} name="reason" minLength={3} maxLength={500} required placeholder="Lý do bắt buộc" />
                  <button className={item.status === "ACTIVE" ? "danger-button" : "secondary-button"}>{item.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt lại"}</button>
                </form>
                <section className="admin-panel" aria-label="Đường dẫn QR công khai">
                  <strong>Đường dẫn QR công khai</strong>
                  {item.publicUrl ? (
                    <>
                      <p>Đây là đích QR bệnh nhân sẽ mở.</p>
                      <input readOnly value={item.publicUrl} aria-label="Đường dẫn QR công khai" />
                    </>
                  ) : (
                    <p>Chưa có cấu hình địa chỉ trang công khai của bệnh viện. Hệ thống không dùng fallback sang domain nhà phát triển.</p>
                  )}
                </section>
              </div>
            </DialogContent>
          </Dialog>
        );
      },
    },
  ];
  return <DataTable className="admin-data-table" columns={columns} data={data} getRowId={(row) => row.id} filterPlaceholder="Lọc mã hoặc tên khoa…" emptyMessage="Chưa có khoa điều trị." />;
}
