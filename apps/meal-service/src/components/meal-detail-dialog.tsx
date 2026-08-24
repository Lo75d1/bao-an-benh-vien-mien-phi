"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ManagementMeal } from "@/lib/management";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatMass } from "@/lib/presentation";

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false });
const STATUS_LABEL = { PLANNED: "Dự kiến", LOCKED: "Đã nhận", PREPARING: "Đang chuẩn bị", PREPARED: "Đã chuẩn bị", SERVED: "Đã hoàn thành" } as const;
const ACK_LABEL = { PENDING: "Chờ bếp xác nhận", RECEIVED: "Bếp đã nhận", INSUFFICIENT: "Bếp báo không đủ", SUBSTITUTE: "Cần thay thế" } as const;
const EVIDENCE_LABEL = { MEAL_PHOTO: "Ảnh bữa ăn", FOOD_SAMPLE: "Ảnh lưu mẫu" } as const;
const CRITERION_LABEL = { OK: "Đạt", LOW: "Thiếu", HIGH: "Vượt", MISSING: "—" } as const;

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
  const reportedDepartments = meal.departments.filter((department) => department.reportId);
  const departmentServingTotal = reportedDepartments.length > 0 && reportedDepartments.every((department) => department.totalServings !== null)
    ? reportedDepartments.reduce((sum, department) => sum + (department.totalServings ?? 0), 0)
    : null;

  return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="calendar-detail-dialog calendar-meal-detail-dialog overflow-y-auto"><DialogHeader><DialogTitle>{meal.name} · {date} · {stateLabel}</DialogTitle><DialogDescription>Chốt lúc {meal.cutoffTime} · Ăn lúc {meal.serviceTime}. Chỗ chưa có dữ liệu được giữ là “—”.</DialogDescription></DialogHeader>
    <section className={hasWarnings ? "calendar-missing-summary warning" : "calendar-missing-summary ok"}>
      <div><h3>{hasWarnings ? "Nội dung chưa xác nhận" : "Đã đủ thông tin xác nhận"}</h3>{hasWarnings ? <ul>{missingDepartments.length ? <li>Khoa chưa báo: {missingDepartments.map((item) => item.name).join(", ")}</li> : null}{missingMenus.length ? <li>Thực đơn chưa duyệt hoặc còn trống: {missingMenus.map((item) => item.code).join(", ")}</li> : null}{pendingAdditions.length ? <li>{pendingAdditions.length} phát sinh đang chờ bếp xác nhận.</li> : null}{!hasMealPhoto ? <li>Chưa có ảnh bữa ăn.</li> : null}{!hasFoodSample ? <li>Chưa có ảnh lưu mẫu.</li> : null}</ul> : <p>Không có cảnh báo tại bữa này.</p>}</div>
      {canPlanMenu && stateLabel === "Chưa đến" && editableDiet ? <Link className="button calendar-menu-action" href={`/thuc-don?meal=${encodeURIComponent(editableDiet.id)}`}>{missingMenus.length ? "Lên thực đơn" : "Sửa thực đơn"}</Link> : null}
    </section>
    <div className="calendar-detail-grid">
      <section><h3>Mã chế độ, số xuất và thực đơn</h3>{meal.diets.length ? meal.diets.map((diet) => {
        const departmentLines = meal.departments.flatMap((department) => department.lines.filter((line) => line.dietCode === diet.code && line.quantity > 0).map((line) => ({ department: department.name, quantity: line.quantity })));
        return <article className="calendar-diet-detail" key={diet.id}><header><strong><span translate="no">{diet.code}</span> · {diet.name}</strong><span>{STATUS_LABEL[diet.status]}</span></header>
          <div className="calendar-diet-summary"><div><span>Tổng xuất</span><strong>{diet.servings === null ? "—" : number.format(diet.servings)}</strong></div><div><span>Khoa đã báo mã này</span><strong>{departmentLines.length || "—"}</strong></div><div><span>Thực đơn</span><strong>{diet.approved ? "Đã khóa" : "Còn chỉnh sửa"}</strong></div></div>
          <div className="calendar-diet-departments">{departmentLines.length ? departmentLines.map((line) => <span key={`${diet.id}-${line.department}`}>{line.department}<strong>{number.format(line.quantity)} suất</strong></span>) : <span>— · Chưa có khoa báo mã này.</span>}</div>
          <p>{diet.menuItems.length ? [...new Set(diet.menuItems.map((item) => item.dishName))].join(", ") : "— · Chưa có thực đơn."}</p>
          {diet.menuItems.length ? <table><thead><tr><th scope="col">Món</th><th scope="col">Thực phẩm</th><th scope="col">Gram/suất</th></tr></thead><tbody>{diet.menuItems.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.dishName}</td><td>{item.name}</td><td>{item.grams === null ? "—" : number.format(item.grams)}</td></tr>)}</tbody></table> : null}
          <div className="ops-criteria">{diet.criteria.length ? diet.criteria.map((criterion) => <span key={criterion.key}><strong>{criterion.label}</strong>{CRITERION_LABEL[criterion.status]}</span>) : <span>— · Chưa có đánh giá.</span>}</div>
          <dl className="calendar-people"><div><dt>Lên thực đơn</dt><dd>{diet.approvedBy ?? "—"}</dd></div><div><dt>Báo suất</dt><dd>{diet.reportedBy.length ? diet.reportedBy.join(", ") : "—"}</dd></div><div><dt>Bếp</dt><dd>{diet.kitchenLead ?? "—"}</dd></div></dl>
        </article>;
      }) : <p>— · Chưa có mã chế độ.</p>}</section>
      <aside><section><h3>Số xuất theo khoa</h3>{meal.departments.length ? <table className="calendar-department-summary"><thead><tr><th scope="col">Khoa</th><th scope="col">Trạng thái</th><th scope="col">Suất</th></tr></thead><tbody>{meal.departments.map((department) => <tr key={department.id}><td>{department.name}</td><td className={department.reportId ? "ok" : "warning"}>{department.reportId ? "Đã báo" : "Chưa báo"}</td><td>{department.totalServings === null ? "—" : number.format(department.totalServings)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2} scope="row">Tổng đã báo</th><td>{departmentServingTotal === null ? "—" : number.format(departmentServingTotal)}</td></tr></tfoot></table> : <p>— · Chưa có khoa trong phạm vi.</p>}</section><section><h3>Phát sinh / báo trễ</h3>{meal.additions.length ? meal.additions.map((item) => <article className="calendar-addition" key={item.id}><strong>+{item.quantity} suất · <span translate="no">{item.dietCode}</span></strong><p>{item.reason}</p><small>{item.submittedBy} · {dateTime.format(new Date(item.submittedAt))}</small><b className={`addition-ack ack-${item.ackStatus.toLowerCase()}`}>{ACK_LABEL[item.ackStatus]}</b></article>) : <p>— · Không có phát sinh.</p>}</section><section><h3>Tóm tắt thực đơn</h3><p>{menuNames.length ? menuNames.join(", ") : "—"}</p></section></aside>
    </div>
    <section className="calendar-evidence-section"><h3>Bằng chứng bếp</h3>{evidence.length ? <div className="calendar-evidence-scroll"><table className="calendar-evidence-table"><thead><tr><th scope="col">Mã</th><th scope="col">Loại</th><th scope="col">Ảnh</th><th scope="col">Người gửi</th><th scope="col">Thời gian</th><th scope="col">Ghi chú</th></tr></thead><tbody>{evidence.map((item) => <tr key={item.id}><td><strong translate="no">{item.dietCode}</strong></td><td>{EVIDENCE_LABEL[item.kind]}</td><td>{item.publicUrl ? <a href={item.publicUrl} target="_blank" rel="noreferrer" aria-label={`Xem ${EVIDENCE_LABEL[item.kind]} của mã ${item.dietCode}`}><Image src={item.publicUrl} alt={EVIDENCE_LABEL[item.kind]} width={96} height={64} unoptimized/></a> : "—"}</td><td>{item.uploadedBy}</td><td>{dateTime.format(new Date(item.uploadedAt))}</td><td>{item.note ?? "—"}</td></tr>)}</tbody></table></div> : <p>— · Chưa có ảnh bằng chứng từ bếp.</p>}</section>
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
