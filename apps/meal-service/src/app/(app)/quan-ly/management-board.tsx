"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChefHat, ChevronRight, Clock3, UsersRound } from "lucide-react";
import type { ManagementDay, ManagementDepartment, ManagementDiet, ManagementMeal, ManagementStatus } from "@/lib/management";

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
const STATUS_LABEL: Record<ManagementStatus, string> = { PLANNED: "Dự kiến", LOCKED: "Đã chốt", PREPARING: "Đang chuẩn bị", PREPARED: "Đã chuẩn bị", SERVED: "Đã phục vụ" };
const ACK_LABEL = { PENDING: "Chờ bếp xác nhận", RECEIVED: "Bếp đã nhận", INSUFFICIENT: "Bếp báo không đủ", SUBSTITUTE: "Cần thay thế" } as const;

function selectedDiets(meal: ManagementMeal, department: ManagementDepartment): Array<{ diet: ManagementDiet; quantity: number }> {
  return department.lines.flatMap((line) => { const diet = meal.diets.find((item) => item.code === line.dietCode); return diet ? [{ diet, quantity: line.quantity }] : []; });
}

function statusOf(diets: Array<{ diet: ManagementDiet }>): ManagementStatus | null {
  if (!diets.length) return null;
  const order: ManagementStatus[] = ["PLANNED", "LOCKED", "PREPARING", "PREPARED", "SERVED"];
  return diets.reduce((earliest, item) => order.indexOf(item.diet.status) < order.indexOf(earliest) ? item.diet.status : earliest, diets[0].diet.status);
}

function OperationsDetail({ meal, department }: { meal: ManagementMeal; department: ManagementDepartment }) {
  const diets = selectedDiets(meal, department);
  const additions = meal.additions.filter((item) => item.departmentId === department.id);
  const stage = statusOf(diets);
  const menuNames = [...new Set(diets.flatMap(({ diet }) => diet.menuItems.map((item) => item.name)))];
  return <aside className="ops-detail" aria-label={`Chi tiết ${department.name}`}><header><div><h2>{department.name}</h2><span translate="no">{department.code}</span></div><strong className={department.reportId ? "detail-state ok" : "detail-state warning"}>{department.reportId ? "Đã báo" : "Chưa báo"}</strong></header><dl className="ops-people"><div><dt>Người báo</dt><dd>{department.submittedBy ?? "—"}</dd></div><div><dt>Thời gian báo</dt><dd>{department.submittedAt ? time.format(new Date(department.submittedAt)) : "—"}</dd></div></dl>
    <section><h3>Cơ cấu suất ăn</h3>{diets.length ? <table className="ops-diet-table"><thead><tr><th>Chế độ ăn</th><th>Suất</th><th>Tỷ lệ</th></tr></thead><tbody>{diets.map(({ diet, quantity }) => <tr key={diet.id}><td><span translate="no">{diet.code}</span> · {diet.name}</td><td>{number.format(quantity)}</td><td>{department.totalServings ? `${number.format(quantity / department.totalServings * 100)}%` : "—"}</td></tr>)}</tbody><tfoot><tr><th>Tổng cộng</th><td>{department.totalServings === null ? "—" : number.format(department.totalServings)}</td><td>{department.totalServings ? "100%" : "—"}</td></tr></tfoot></table> : <p className="ops-missing">— · Chưa có chi tiết chế độ ăn.</p>}</section>
    <section className="ops-menu"><div><h3>Thực đơn đã duyệt</h3><Link href="/lich">Xem chi tiết</Link></div><p>{menuNames.length ? menuNames.join(", ") : "— · Chưa có thực đơn đã duyệt."}</p></section>
    <section><h3>Tiến độ bếp</h3><div className="kitchen-progress">{(["LOCKED", "PREPARING", "PREPARED", "SERVED"] as ManagementStatus[]).map((status, index) => { const activeIndex = stage ? (["LOCKED", "PREPARING", "PREPARED", "SERVED"] as ManagementStatus[]).indexOf(stage) : -1; const done = activeIndex >= index; return <div className={done ? "done" : ""} key={status}><span>{done ? <Check/> : index + 1}</span><strong>{STATUS_LABEL[status]}</strong></div>; })}</div></section>
    <section><h3>Phát sinh liên quan ({additions.length})</h3>{additions.length ? <div className="ops-additions">{additions.map((item) => <article key={item.id}><i/><div><strong>+{number.format(item.quantity)} suất · <span translate="no">{item.dietCode}</span></strong><p>{item.reason}</p><small>{time.format(new Date(item.submittedAt))} · {ACK_LABEL[item.ackStatus]}</small></div></article>)}</div> : <p className="ops-missing">— · Không có phát sinh ở khoa này.</p>}</section>
  </aside>;
}

export function ManagementBoard({ data }: { data: ManagementDay }) {
  const [mealId, setMealId] = useState(data.meals[0]?.id ?? "");
  const meal = data.meals.find((item) => item.id === mealId) ?? data.meals[0] ?? null;
  const [departmentId, setDepartmentId] = useState(meal?.departments.find((item) => item.reportId)?.id ?? meal?.departments[0]?.id ?? "");
  const department = meal?.departments.find((item) => item.id === departmentId) ?? meal?.departments[0] ?? null;
  const totals = useMemo(() => ({ servings: meal?.reportedServings ?? null, missing: meal ? meal.totalDepartmentCount - meal.reportedDepartmentCount : 0, menus: meal?.diets.filter((item) => item.menuItems.length === 0).length ?? 0, pending: meal?.additions.filter((item) => item.ackStatus === "PENDING").length ?? 0 }), [meal]);
  if (!meal) return <section className="ops-empty">— · Chưa có bữa ăn trong lịch ngày đã chọn.</section>;
  function chooseMeal(id: string) { const next = data.meals.find((item) => item.id === id); setMealId(id); setDepartmentId(next?.departments.find((item) => item.reportId)?.id ?? next?.departments[0]?.id ?? ""); }
  return <section className="ops-command" aria-label="Điều hành suất ăn toàn viện"><div className="ops-status-strip"><div><Clock3/><span><small>Bữa đang chọn</small><strong>{meal.name} · {meal.serviceTime}</strong></span></div><div><UsersRound/><span><small>Tổng đã báo</small><strong>{totals.servings === null ? "—" : `${number.format(totals.servings)} suất`}</strong></span></div><div className={totals.missing ? "warning" : ""}><Check/><span><small>Tiến độ khoa</small><strong>{meal.reportedDepartmentCount}/{meal.totalDepartmentCount} khoa đã báo</strong></span></div><div className={totals.menus ? "warning" : ""}><AlertTriangle/><span><small>Thực đơn</small><strong>{totals.menus} chưa duyệt</strong></span></div><div className={totals.pending ? "warning" : ""}><ChefHat/><span><small>Phát sinh</small><strong>{totals.pending} chờ bếp</strong></span></div></div>
    <div className="ops-layout"><div className="ops-master"><nav className="meal-tabs" aria-label="Chọn bữa">{data.meals.map((item) => <button type="button" key={item.id} className={item.id === meal.id ? "active" : ""} onClick={() => chooseMeal(item.id)}>{item.name}<small>{item.serviceTime}</small></button>)}</nav><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Khoa</th><th>Đã báo</th><th>Tổng suất</th><th>Phát sinh</th><th>Trạng thái</th><th><span className="sr-only">Mở</span></th></tr></thead><tbody>{meal.departments.map((item) => { const additions = meal.additions.filter((addition) => addition.departmentId === item.id); const related = selectedDiets(meal, item); const state = statusOf(related); const active = item.id === department?.id; return <tr key={item.id} className={`${active ? "selected" : ""} ${!item.reportId ? "exception" : ""}`} onClick={() => setDepartmentId(item.id)}><td><button type="button"><strong>{item.name}</strong><small translate="no">{item.code}</small></button></td><td>{item.reportId ? <span className="report-check"><Check/></span> : <span className="report-alert"><AlertTriangle/></span>}</td><td>{item.totalServings === null ? "—" : number.format(item.totalServings)}</td><td className={additions.length ? "has-addition" : ""}>{additions.length ? `+${number.format(additions.reduce((sum, addition) => sum + addition.quantity, 0))}` : "—"}</td><td><span className={`row-state ${item.reportId ? "ok" : "warning"}`}>{item.reportId ? (state ? STATUS_LABEL[state] : "Đã báo") : "Chưa báo"}</span></td><td><ChevronRight/></td></tr>; })}</tbody><tfoot><tr><th>Tổng cộng</th><td>{meal.reportedDepartmentCount}/{meal.totalDepartmentCount}</td><td>{totals.servings === null ? "—" : number.format(totals.servings)}</td><td>+{number.format(meal.additions.reduce((sum, item) => sum + item.quantity, 0))}</td><td colSpan={2}/></tr></tfoot></table></div></div>{department && <OperationsDetail meal={meal} department={department}/>}</div>
  </section>;
}
