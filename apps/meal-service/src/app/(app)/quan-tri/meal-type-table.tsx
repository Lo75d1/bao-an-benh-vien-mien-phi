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

type Action = (data: FormData) => Promise<void>;
export type MealTypeRow = {
  id: string;
  code: string;
  name: string;
  cutoffTime: string;
  serviceTime: string;
  feedingRoute: "NORMAL" | "SONDE";
  routeLabel: string;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE";
  statusLabel: string;
};

export function MealTypeTable({
  data,
  saveAction,
  statusAction,
}: {
  data: MealTypeRow[];
  saveAction: Action;
  statusAction: Action;
}) {
  const columns: ColumnDef<MealTypeRow, unknown>[] = [
    {
      accessorKey: "code",
      header: "Mã",
      cell: ({ row }) => <strong>{row.original.code}</strong>,
    },
    { accessorKey: "name", header: "Tên bữa" },
    { accessorKey: "routeLabel", header: "Lịch" },
    { accessorKey: "cutoffTime", header: "Giờ chốt" },
    { accessorKey: "serviceTime", header: "Giờ phục vụ" },
    { accessorKey: "sortOrder", header: "Thứ tự", meta: { numeric: true } },
    { accessorKey: "statusLabel", header: "Trạng thái" },
    {
      id: "actions",
      header: "Thao tác",
      enableSorting: false,
      cell: ({ row }) => {
        const meal = row.original;
        const reasonId = `meal-status-reason-${meal.id}`;
        return (
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="secondary-button">
                Sửa
              </button>
            </DialogTrigger>
            <DialogContent className="admin-dialog max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Sửa bữa {meal.name}</DialogTitle>
                <DialogDescription>
                  Cập nhật giờ hoặc trạng thái mà không xóa lịch sử đã phát
                  sinh.
                </DialogDescription>
              </DialogHeader>
              <div className="admin-detail">
                <form action={saveAction} className="admin-grid">
                  <input type="hidden" name="mealTypeId" value={meal.id} />
                  <label>
                    Mã
                    <input
                      name="code"
                      defaultValue={meal.code}
                      autoComplete="off"
                      spellCheck={false}
                      required
                    />
                  </label>
                  <label>
                    Tên bữa
                    <input
                      name="name"
                      defaultValue={meal.name}
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label>
                    Loại lịch
                    <select name="feedingRoute" defaultValue={meal.feedingRoute}>
                      <option value="NORMAL">Suất ăn thường</option>
                      <option value="SONDE">Cữ Sonde</option>
                    </select>
                  </label>
                  <label>
                    Giờ chốt
                    <input
                      name="cutoffTime"
                      type="time"
                      defaultValue={meal.cutoffTime}
                      required
                    />
                  </label>
                  <label>
                    Giờ phục vụ
                    <input
                      name="serviceTime"
                      type="time"
                      defaultValue={meal.serviceTime}
                      required
                    />
                  </label>
                  <label>
                    Thứ tự
                    <input
                      name="sortOrder"
                      type="number"
                      min="0"
                      max="999"
                      defaultValue={meal.sortOrder}
                      required
                    />
                  </label>
                  <button className="secondary-button">Lưu sửa đổi</button>
                </form>
                <form action={statusAction} className="status-form">
                  <input type="hidden" name="mealTypeId" value={meal.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={meal.status === "ACTIVE" ? "false" : "true"}
                  />
                  <label className="sr-only" htmlFor={reasonId}>
                    Lý do đổi trạng thái
                  </label>
                  <input
                    id={reasonId}
                    name="reason"
                    minLength={3}
                    maxLength={500}
                    autoComplete="off"
                    required
                    placeholder="Lý do bắt buộc"
                  />
                  <button
                    className={
                      meal.status === "ACTIVE"
                        ? "danger-button"
                        : "secondary-button"
                    }
                  >
                    {meal.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt lại"}
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
      filterPlaceholder="Lọc mã hoặc tên bữa…"
      emptyMessage="Chưa có bữa ăn."
    />
  );
}
