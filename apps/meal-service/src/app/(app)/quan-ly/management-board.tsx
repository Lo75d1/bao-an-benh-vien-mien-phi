"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChefHat, ChevronRight, Clock3, UsersRound } from "lucide-react";
import type { ManagementDay, ManagementDepartment, ManagementDiet, ManagementMeal, ManagementStatus } from "@/lib/management";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false });
const STATUS_LABEL: Record<ManagementStatus, string> = { PLANNED: "Dự kiến", LOCKED: "Đã nhận", PREPARING: "Đang chuẩn bị", PREPARED: "Đang nấu", SERVED: "Chờ xuất" };
const ACK_LABEL = { PENDING: "Chờ bếp xác nhận", RECEIVED: "Bếp đã nhận", INSUFFICIENT: "Bếp báo không đủ", SUBSTITUTE: "Cần thay thế" } as const;

function selectedDiets(meal: ManagementMeal, department: ManagementDepartment): Array<{ diet: ManagementDiet; quantity: number }> {
  return department.lines.flatMap((line) => { const diet = meal.diets.find((item) => item.code === line.dietCode); return diet ? [{ diet, quantity: line.quantity }] : []; });
}

function statusOf(diets: Array<{ diet: ManagementDiet }>): ManagementStatus | null {
  if (!diets.length) return null;
  const order: ManagementStatus[] = ["PLANNED", "LOCKED", "PREPARING", "PREPARED", "SERVED"];
  return diets.reduce((earliest, item) => order.indexOf(item.diet.status) < order.indexOf(earliest) ? item.diet.status : earliest, diets[0].diet.status);
}

function defaultMealId(data: ManagementDay) {
  const now = new Date(data.generatedAt);
  const currentMinutes = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).replace(":", ""));
  const upcoming = data.meals.find((meal) => Number(meal.serviceTime.replace(":", "")) >= currentMinutes);
  return (upcoming ?? data.meals[data.meals.length - 1])?.id ?? "";
}

function milestoneTime(diets: Array<{ diet: ManagementDiet }>, status: ManagementStatus) {
  const values = diets.flatMap(({ diet }) => diet.kitchenTimes[status] ? [diet.kitchenTimes[status] as string] : []);
  return values.length ? time.format(new Date(values.sort()[0])) : "—";
}

function OperationsDetail({ meal, department }: { meal: ManagementMeal; department: ManagementDepartment }) {
  const diets = selectedDiets(meal, department);
  const additions = meal.additions.filter((item) => item.departmentId === department.id);
  const stage = statusOf(diets);
  const menuNames = [...new Set(diets.flatMap(({ diet }) => diet.menuItems.map((item) => item.dishName)))];
  const approved = diets.length > 0 && diets.every(({ diet }) => diet.approved);
  return <aside className="ops-detail" aria-label={`Chi tiết ${department.name}`}><header><div><h2>{department.name}</h2><span translate="no">{department.code}</span></div><strong className={approved ? "detail-state ok" : "detail-state warning"}>{approved ? "Đã duyệt" : department.reportId ? "Chờ duyệt" : "Chưa báo"}</strong></header><dl className="ops-people"><div><dt>Người báo</dt><dd>{department.submittedBy ?? "—"}</dd></div><div><dt>Thời gian báo</dt><dd>{department.submittedAt ? dateTime.format(new Date(department.submittedAt)) : "—"}</dd></div></dl>
    <section><h3>Cơ cấu suất ăn</h3>{diets.length ? <table className="ops-diet-table"><thead><tr><th>Chế độ ăn</th><th>Suất</th><th>Tỷ lệ</th></tr></thead><tbody>{diets.map(({ diet, quantity }) => <tr key={diet.id}><td><span translate="no">{diet.code}</span> · {diet.name}</td><td>{number.format(quantity)}</td><td>{department.totalServings ? `${number.format(quantity / department.totalServings * 100)}%` : "—"}</td></tr>)}</tbody><tfoot><tr><th>Tổng cộng</th><td>{department.totalServings === null ? "—" : number.format(department.totalServings)}</td><td>{department.totalServings ? "100%" : "—"}</td></tr></tfoot></table> : <p className="ops-missing">— · Chưa có chi tiết chế độ ăn.</p>}</section>
    <section className="ops-menu"><div><h3>Thực đơn đã duyệt</h3><Dialog><DialogTrigger asChild><button type="button" disabled={!menuNames.length}>Xem chi tiết</button></DialogTrigger><DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Thực đơn · {department.name}</DialogTitle><DialogDescription>Chi tiết món, định lượng và đánh giá theo từng mã.</DialogDescription></DialogHeader><div className="ops-menu-dialog">{diets.map(({ diet, quantity }) => <section key={diet.id}><h3><span translate="no">{diet.code}</span> · {diet.name} · {quantity} suất</h3>{diet.menuItems.length ? <table><thead><tr><th scope="col">Món</th><th scope="col">Thực phẩm</th><th scope="col">Gram</th></tr></thead><tbody>{diet.menuItems.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.dishName}</td><td>{item.name}</td><td>{item.grams === null ? "—" : number.format(item.grams)}</td></tr>)}</tbody></table> : <p>— · Chưa có snapshot.</p>}<div className="ops-criteria">{diet.criteria.length ? diet.criteria.map((criterion) => <span key={criterion.key}><strong>{criterion.label}</strong>{criterion.status === "MISSING" ? "—" : criterion.status}</span>) : <span>— · Chưa có đánh giá.</span>}</div></section>)}</div></DialogContent></Dialog></div><p>{menuNames.length ? menuNames.join(", ") : "— · Chưa có thực đơn đã duyệt."}</p></section>
    <section><h3>Tiến độ bếp</h3><div className="kitchen-progress">{(["LOCKED", "PREPARING", "PREPARED", "SERVED"] as ManagementStatus[]).map((status, index) => { const activeIndex = stage ? (["LOCKED", "PREPARING", "PREPARED", "SERVED"] as ManagementStatus[]).indexOf(stage) : -1; const done = activeIndex >= index; const active = activeIndex === index; return <div className={`${done ? "done" : ""} ${active ? "active" : ""}`} key={status}><span>{done ? <Check/> : index + 1}</span><strong>{STATUS_LABEL[status]}</strong><small>{milestoneTime(diets, status)}</small></div>; })}</div></section>
    <section><h3>Phát sinh liên quan ({additions.length})</h3>{additions.length ? <div className="ops-additions">{additions.map((item) => <article key={item.id}><i/><div><strong>+{number.format(item.quantity)} suất · <span translate="no">{item.dietCode}</span></strong><p>{item.reason}</p><small>{item.submittedBy} · {dateTime.format(new Date(item.submittedAt))}</small><b className={`addition-ack ack-${item.ackStatus.toLowerCase()}`}>{ACK_LABEL[item.ackStatus]}</b></div></article>)}</div> : <p className="ops-missing">— · Không có phát sinh ở khoa này.</p>}</section>
  </aside>;
}

export function ManagementBoard({ data }: { data: ManagementDay }) {
  const [mealId, setMealId] = useState(() => defaultMealId(data));
  const meal = data.meals.find((item) => item.id === mealId) ?? data.meals[0] ?? null;
  const [departmentId, setDepartmentId] = useState(meal?.departments.find((item) => item.reportId)?.id ?? meal?.departments[0]?.id ?? "");
  const department = meal?.departments.find((item) => item.id === departmentId) ?? meal?.departments[0] ?? null;
  const totals = useMemo(() => ({ servings: meal?.plannedServings ?? null, missing: meal ? meal.totalDepartmentCount - meal.reportedDepartmentCount : 0, menus: meal?.unapprovedDiets ?? 0, pending: meal?.additions.filter((item) => item.ackStatus === "PENDING").length ?? 0 }), [meal]);
  if (!meal) return <section className="ops-empty">— · Chưa có bữa ăn trong lịch ngày đã chọn.</section>;
  function chooseMeal(id: string) { const next = data.meals.find((item) => item.id === id); setMealId(id); setDepartmentId(next?.departments.find((item) => item.reportId)?.id ?? next?.departments[0]?.id ?? ""); }
  return <section className="ops-command" aria-label="Điều hành suất ăn toàn viện"><div className="ops-status-strip"><div><Clock3/><span><small>Bữa đang chọn</small><strong>{meal.name} · {meal.serviceTime}</strong></span></div><div><UsersRound/><span><small>Tổng toàn viện</small><strong>{totals.servings === null ? "—" : `${number.format(totals.servings)} suất`}</strong></span></div><div className={totals.missing ? "warning" : ""}><Check/><span><small>Tiến độ khoa</small><strong>{meal.reportedDepartmentCount}/{meal.totalDepartmentCount} khoa đã báo</strong></span></div><div className={totals.menus ? "warning" : ""}><AlertTriangle/><span><small>Thực đơn</small><strong>{totals.menus} chưa duyệt</strong></span></div><div className={totals.pending ? "warning" : ""}><ChefHat/><span><small>Phát sinh</small><strong>{totals.pending} chờ bếp</strong></span></div></div>
    <div className="ops-layout"><div className="ops-master"><nav className="meal-tabs" role="tablist" aria-label="Chọn bữa">{data.meals.map((item) => <button type="button" role="tab" aria-selected={item.id === meal.id} key={item.id} className={item.id === meal.id ? "active" : ""} onClick={() => chooseMeal(item.id)}>{item.name}<small>{item.serviceTime}</small></button>)}</nav><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th scope="col">Khoa</th><th scope="col">Đã báo</th><th scope="col">Tổng suất</th><th scope="col">Phát sinh</th><th scope="col">Trạng thái</th><th scope="col"><span className="sr-only">Mở</span></th></tr></thead><tbody>{meal.departments.map((item) => { const additions = meal.additions.filter((addition) => addition.departmentId === item.id); const related = selectedDiets(meal, item); const approved = related.length > 0 && related.every(({ diet }) => diet.approved); const active = item.id === department?.id; const select = () => setDepartmentId(item.id); return <tr key={item.id} tabIndex={0} aria-current={active ? "true" : undefined} className={`${active ? "selected" : ""} ${!item.reportId ? "exception" : ""}`} onClick={select} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } }}><th scope="row"><button type="button" tabIndex={-1}><strong>{item.name}</strong><small translate="no">{item.code}</small></button></th><td>{item.reportId ? <span className="report-check"><Check/></span> : <span className="report-alert"><AlertTriangle/></span>}</td><td>{item.totalServings === null ? "—" : number.format(item.totalServings)}</td><td className={additions.length ? "has-addition" : "zero-addition"}>{additions.length}</td><td><span className={`row-state ${approved ? "ok" : "warning"}`}>{!item.reportId ? "Chưa báo" : approved ? "Đã duyệt" : "Chờ duyệt"}</span></td><td><ChevronRight/></td></tr>; })}</tbody><tfoot><tr><th scope="row">Tổng cộng</th><td>{meal.reportedDepartmentCount}/{meal.totalDepartmentCount}</td><td>{meal.reportedServings === null ? "—" : number.format(meal.reportedServings)}</td><td>{meal.additions.length}</td><td colSpan={2}/></tr></tfoot></table></div></div>{department && <OperationsDetail meal={meal} department={department}/>}</div>
  </section>;
}
