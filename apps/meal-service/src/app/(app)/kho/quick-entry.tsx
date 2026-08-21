"use client";

import { useState } from "react";
import { createTransactionAction } from "./actions";

type WarehouseOption = { id: string; name: string; kind: string };
type MealOption = { id: string; feedingRoute: string; label: string };

export function QuickEntry({ warehouses, meals, defaultOccurredAt }: { warehouses: WarehouseOption[]; meals: MealOption[]; defaultOccurredAt: string }) {
  const [rows, setRows] = useState([0, 1]);
  return <form action={createTransactionAction} className="warehouse-entry-form">
    <div className="warehouse-form-head">
      <label>Loại giao dịch<select name="type" required><option value="IN">Nhập kho</option><option value="OUT">Thực xuất</option><option value="ADJUST">Điều chỉnh</option></select></label>
      <label>Kho<select name="warehouseId" required>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.kind === "GENERAL" ? "Tổng" : warehouse.kind === "KITCHEN" ? "Bếp" : "Sonde"})</option>)}</select></label>
      <label>Thời điểm<input type="datetime-local" name="occurredAt" defaultValue={defaultOccurredAt} required/></label>
      <label>Bữa liên kết<select name="relatedDietMealId"><option value="">Không liên kết</option>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.label} - {meal.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"}</option>)}</select></label>
    </div>
    <div className="warehouse-lines"><div className="warehouse-line warehouse-line-head"><span>Thực phẩm / tên tự do</span><span>Mã thực phẩm</span><span>Số lượng</span><span>Đơn vị</span><span>Đơn giá</span></div>{rows.map((row) => <div className="warehouse-line" key={row}><input name="itemName" aria-label={`Tên thực phẩm dòng ${row + 1}`} maxLength={200}/><input name="foodId" aria-label={`Mã thực phẩm dòng ${row + 1}`} placeholder="Không bắt buộc"/><input name="quantity" aria-label={`Số lượng dòng ${row + 1}`} type="number" min="0.001" step="0.001" inputMode="decimal"/><input name="unit" aria-label={`Đơn vị dòng ${row + 1}`} placeholder="g, kg, chai" maxLength={30}/><input name="unitPrice" aria-label={`Đơn giá dòng ${row + 1}`} type="number" min="0" step="0.01" inputMode="decimal"/></div>)}</div>
    <div className="warehouse-form-actions"><button type="button" className="secondary-button" onClick={() => setRows((current) => [...current, Math.max(...current) + 1])}>Thêm dòng</button><label className="warehouse-note">Ghi chú<input name="note" maxLength={500} placeholder="Có thể bổ sung sau"/></label><button className="primary-action">Lưu ngay</button></div>
  </form>;
}
