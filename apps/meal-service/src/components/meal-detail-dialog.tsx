"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ManagementMeal } from "@/lib/management";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatMass } from "@/lib/presentation";

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false });
const STATUS_LABEL = { PLANNED: "Dự kiến", LOCKED: "Đã nhận", PREPARING: "Đang chuẩn bị", PREPARED: "Đang nấu", SERVED: "Kết thúc" } as const;
const ACK_LABEL = { PENDING: "Chờ bếp xác nhận", RECEIVED: "Bếp đã nhận", INSUFFICIENT: "Bếp báo không đủ", SUBSTITUTE: "Cần thay thế" } as const;

export function MealDetailDialog({ meal, date, stateLabel, trigger, canPlanMenu = false }: { meal: ManagementMeal; date: string; stateLabel: string; trigger: ReactNode; canPlanMenu?: boolean }) {
  const menuNames = [...new Set(meal.diets.flatMap((diet) => diet.menuItems.map((item) => item.dishName)))];
  const evidence = meal.diets.flatMap((diet) => diet.evidence.map((item) => ({ ...item, dietCode: diet.code })));
  const missingDepartments = meal.departments.filter((department) => !department.reportId);
  const missingMenus = meal.diets.filter((diet) => !diet.approved || diet.menuItems.length === 0);
  const pendingAdditions = meal.additions.filter((item) => item.ackStatus === "PENDING");
  const hasMealPhoto = evidence.some((item) => item.kind === "MEAL_PHOTO");
  const hasFoodSample = evidence.some((item) => item.kind === "FOOD_SAMPLE");
  const hasWarnings = missingDepartments.length > 0 || missingMenus.length > 0 || pendingAdditions.length > 0 || !hasMealPhoto || !hasFoodSample;
  const editableDiet = missingMenus[0] ?? meal.diets[0];
  return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="calendar-detail-dialog max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{meal.name} · {date} · {stateLabel}</DialogTitle><DialogDescription>Chốt lúc {meal.cutoffTime} · Ăn lúc {meal.serviceTime}. Chỗ chưa có dữ liệu được giữ là “—”.</DialogDescription></DialogHeader>
    <section className={hasWarnings ? "calendar-missing-summary warning" : "calendar-missing-summary ok"}>
      <div><h3>{hasWarnings ? "Nội dung chưa xác nhận" : "Đã đủ thông tin xác nhận"}</h3>
      {hasWarnings ? <ul>
        {missingDepartments.length ? <li>Khoa chưa báo: {missingDepartments.map((item) => item.name).join(", ")}</li> : null}
        {missingMenus.length ? <li>Thực đơn chưa duyệt hoặc còn trống: {missingMenus.map((item) => item.code).join(", ")}</li> : null}
        {pendingAdditions.length ? <li>{pendingAdditions.length} phát sinh đang chờ bếp xác nhận.</li> : null}
        {!hasMealPhoto ? <li>Chưa có ảnh bữa ăn.</li> : null}
        {!hasFoodSample ? <li>Chưa có ảnh lưu mẫu.</li> : null}
      </ul> : <p>Không có cảnh báo tại bữa này.</p>}</div>
      {canPlanMenu && stateLabel === "Chưa đến" && editableDiet ? <Link className="button calendar-menu-action" href={`/thuc-don?meal=${encodeURIComponent(editableDiet.id)}`}>{missingMenus.length ? "Lên thực đơn" : "Sửa thực đơn"}</Link> : null}
    </section>
    <div className="calendar-detail-grid">
      <section><h3>Mã chế độ và thực đơn</h3>{meal.diets.length ? meal.diets.map((diet) => <article className="calendar-diet-detail" key={diet.id}><header><strong><span translate="no">{diet.code}</span> · {diet.name}</strong><span>{diet.servings === null ? "—" : `${number.format(diet.servings)} suất`} · {STATUS_LABEL[diet.status]}</span></header><p>{diet.menuItems.length ? [...new Set(diet.menuItems.map((item) => item.dishName))].join(", ") : "— · Chưa có thực đơn."}</p>{diet.menuItems.length ? <table><thead><tr><th scope="col">Món</th><th scope="col">Thực phẩm</th><th scope="col">Gram</th></tr></thead><tbody>{diet.menuItems.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.dishName}</td><td>{item.name}</td><td>{item.grams === null ? "—" : number.format(item.grams)}</td></tr>)}</tbody></table> : null}<div className="ops-criteria">{diet.criteria.length ? diet.criteria.map((criterion) => <span key={criterion.key}><strong>{criterion.label}</strong>{criterion.status === "MISSING" ? "—" : criterion.status}</span>) : <span>— · Chưa có đánh giá.</span>}</div><dl className="calendar-people"><div><dt>Lên thực đơn</dt><dd>{diet.approvedBy ?? "—"}</dd></div><div><dt>Báo suất</dt><dd>{diet.reportedBy.length ? diet.reportedBy.join(", ") : "—"}</dd></div><div><dt>Bếp</dt><dd>{diet.kitchenLead ?? "—"}</dd></div></dl></article>) : <p>— · Chưa có mã chế độ.</p>}</section>
      <aside><section><h3>Khoa đã báo / chưa báo</h3>{meal.departments.length ? <ul className="calendar-department-list">{meal.departments.map((department) => <li key={department.id}><span>{department.name}</span><strong className={department.reportId ? "ok" : "warning"}>{department.reportId ? `Đã báo · ${department.totalServings ?? "—"} suất` : "Chưa báo"}</strong></li>)}</ul> : <p>—</p>}</section><section><h3>Phát sinh / báo trễ</h3>{meal.additions.length ? meal.additions.map((item) => <article className="calendar-addition" key={item.id}><strong>+{item.quantity} suất · <span translate="no">{item.dietCode}</span></strong><p>{item.reason}</p><small>{item.submittedBy} · {dateTime.format(new Date(item.submittedAt))}</small><b className={`addition-ack ack-${item.ackStatus.toLowerCase()}`}>{ACK_LABEL[item.ackStatus]}</b></article>) : <p>— · Không có phát sinh.</p>}</section><section><h3>Bằng chứng bếp</h3><p>Ảnh bữa: {evidence.some((item) => item.kind === "MEAL_PHOTO") ? "Đã có" : "—"} · Lưu mẫu: {evidence.some((item) => item.kind === "FOOD_SAMPLE") ? "Đã có" : "—"}</p>{evidence.map((item) => <small key={item.id}><span translate="no">{item.dietCode}</span> · {item.uploadedBy} · {dateTime.format(new Date(item.uploadedAt))}</small>)}</section><section><h3>Tóm tắt thực đơn</h3><p>{menuNames.length ? menuNames.join(", ") : "—"}</p></section></aside>
    </div>
  </DialogContent></Dialog>;
}

export type KitchenMenuItem = { dishName: string; name: string; grams: number | null; wastePercent: number | null; note: string | null };

export function KitchenMenuDetailDialog({ code, name, servings, items, notes, trigger }: { code: string; name: string; servings: number; items: KitchenMenuItem[]; notes: string[]; trigger: ReactNode }) {
  const dishes = [...new Set(items.map((item) => item.dishName))];
  return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="calendar-detail-dialog max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle><span translate="no">{code}</span> · {name}</DialogTitle><DialogDescription>{servings > 0 ? `${number.format(servings)} suất gồm gốc + bổ sung.` : "— · Chưa có số suất."}</DialogDescription></DialogHeader>
    <section className="kitchen-menu-detail"><h3>Thực đơn</h3>{items.length ? <><p>{dishes.join(" · ")}</p><table><thead><tr><th scope="col">Món</th><th scope="col">Thực phẩm</th><th scope="col">Định lượng/suất</th><th scope="col">Tổng cần nấu</th><th scope="col">Ghi chú</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.dishName}-${item.name}-${index}`}><td>{item.dishName}</td><td>{item.name}</td><td>{formatMass(item.grams)}</td><td>{item.grams === null || servings <= 0 ? "—" : formatMass(item.grams * servings)}</td><td>{item.note ?? (item.wastePercent === null ? <span className="warning">⚠ Thiếu % thải bỏ</span> : `Thải bỏ ${number.format(item.wastePercent)}%`)}</td></tr>)}</tbody></table></> : <p className="warning">— · Chưa có thực đơn duyệt.</p>}</section>
    <section><h3>Ghi chú bệnh nhân đã duyệt</h3>{notes.length ? <ul>{notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ul> : <p>—</p>}</section>
  </DialogContent></Dialog>;
}
