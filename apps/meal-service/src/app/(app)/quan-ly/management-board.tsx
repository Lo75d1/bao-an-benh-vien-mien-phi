"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChefHat, ChevronRight, Circle, RotateCw, UsersRound } from "lucide-react";
import type { ManagementDay, ManagementDepartment, ManagementDiet, ManagementMeal, ManagementStatus } from "@/lib/management";
import { MealDetailDialog } from "@/components/meal-detail-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { displayMealState } from "@/lib/meal-events";
import { addAdminKitchenMilestoneAction } from "./actions";

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false });
const STATUS_LABEL: Record<ManagementStatus, string> = { PLANNED: "Dự kiến", LOCKED: "Đã nhận", PREPARING: "Đang chuẩn bị", PREPARED: "Đang nấu", SERVED: "Kết thúc" };
const ACK_LABEL = { PENDING: "Chờ bếp xác nhận", RECEIVED: "Bếp đã nhận", INSUFFICIENT: "Bếp báo không đủ", SUBSTITUTE: "Cần thay thế" } as const;

function selectedDiets(meal: ManagementMeal, department: ManagementDepartment): Array<{ diet: ManagementDiet; quantity: number }> {
  return department.lines.flatMap((line) => { const diet = meal.diets.find((item) => item.code === line.dietCode); return diet ? [{ diet, quantity: line.quantity }] : []; });
}

function statusOf(diets: Array<{ diet: ManagementDiet }>): ManagementStatus | null {
  if (!diets.length) return null;
  const order: ManagementStatus[] = ["PLANNED", "LOCKED", "PREPARING", "PREPARED", "SERVED"];
  return diets.reduce((earliest, item) => order.indexOf(item.diet.status) < order.indexOf(earliest) ? item.diet.status : earliest, diets[0].diet.status);
}

function mealState(data: ManagementDay, meal: ManagementMeal, now: Date): { key: string } | null {
  const state = displayMealState(new Date(`${data.date}T00:00:00.000Z`), meal.cutoffTime, meal.serviceTime, statusOf(meal.diets.map((diet) => ({ diet }))), now);
  return state?.key === "SERVED" ? { key: "FINISHED" } : state;
}

function defaultMealId(data: ManagementDay, now = new Date(data.generatedAt)) {
  const active = data.meals.find((meal) => ["RECEIVING", "PREPARING", "COOKING", "SERVING"].includes(mealState(data, meal, now)?.key ?? ""));
  return (active ?? data.meals[data.meals.length - 1])?.id ?? "";
}

function milestone(diets: Array<{ diet: ManagementDiet }>, status: ManagementStatus) {
  const values = diets.flatMap(({ diet }) => diet.kitchenTimes[status] ? [{ at: diet.kitchenTimes[status] as string, source: diet.kitchenTimeSources[status] ?? "KITCHEN" }] : []);
  if (!values.length) return null;
  return values.sort((a, b) => a.at.localeCompare(b.at))[0];
}

function ManualMilestoneDialog({ meal, department, status }: { meal: ManagementMeal; department: ManagementDepartment; status: ManagementStatus }) {
  return <Dialog><DialogTrigger asChild><button type="button" className="missing-milestone" aria-label={`Bổ sung mốc ${STATUS_LABEL[status]}`}><AlertTriangle aria-hidden="true"/><span>—</span></button></DialogTrigger><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Bổ sung mốc “{STATUS_LABEL[status]}”</DialogTitle><DialogDescription>Mốc này sẽ được ghi là bổ sung thủ công của admin và lưu vào nhật ký kiểm toán.</DialogDescription></DialogHeader><form action={addAdminKitchenMilestoneAction} className="manual-milestone-form"><input type="hidden" name="mealEventId" value={meal.id}/><input type="hidden" name="departmentId" value={department.id}/><input type="hidden" name="status" value={status}/><label>Thời gian thực tế<input type="datetime-local" name="occurredAt" required/></label><label>Lý do bổ sung<textarea name="reason" minLength={5} maxLength={500} required placeholder="Nêu nguồn đối chiếu và lý do cần bổ sung…"/></label><button className="primary-action">Lưu mốc thủ công</button></form></DialogContent></Dialog>;
}

function MealLifecycle({ data, meal, now }: { data: ManagementDay; meal: ManagementMeal; now: Date }) {
  const state = mealState(data, meal, now);
  const activeIndex = state?.key === "RECEIVING" || state?.key === "UPCOMING" ? 0 : state?.key === "PREPARING" || state?.key === "COOKING" ? 1 : state?.key === "SERVING" ? 2 : 3;
  const cutoff = meal.cutoffAt ? new Date(meal.cutoffAt) : null;
  const remaining = cutoff ? Math.max(0, Math.ceil((cutoff.getTime() - now.getTime()) / 60_000)) : null;
  const next = data.meals[(data.meals.findIndex((item) => item.id === meal.id) + 1) % data.meals.length];
  const activeLabel = activeIndex === 0 ? "Đang nhận báo suất" : activeIndex === 1 ? "Bếp đang chuẩn bị" : activeIndex === 2 ? "Đang phục vụ" : "Kết thúc";
  const detail = activeIndex === 0 ? (remaining === null ? "⚠ Thiếu giờ chốt" : `Còn ${remaining} phút tới giờ chốt ${meal.cutoffTime}`) : activeIndex === 1 ? `Phục vụ lúc ${meal.serviceTime}` : activeIndex === 2 ? `Khung phục vụ ${meal.serviceTime}–${new Date((meal.serviceAt ? new Date(meal.serviceAt).getTime() : now.getTime()) + 60 * 60_000).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })}` : next ? `Bữa kế: ${next.name} lúc ${next.serviceTime}` : "—";
  const steps = [{ label: "Báo suất", icon: Check }, { label: "Bếp chuẩn bị", icon: ChefHat }, { label: "Phục vụ", icon: Circle }, { label: activeIndex === 3 ? "Kết thúc" : "Bữa kế", icon: RotateCw }];
  return <section className="meal-lifecycle" aria-label={`Vòng đời bữa ${meal.name}`}><header><div><span>Đang theo dõi</span><strong>{meal.name} · {activeLabel}</strong></div><p>{detail}</p></header><ol>{steps.map(({ label, icon: Icon }, index) => <li key={label} className={index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming"}><span>{index < activeIndex ? <Check/> : <Icon/>}</span><strong>{label}</strong></li>)}</ol></section>;
}

function OperationsDetail({ meal, department }: { meal: ManagementMeal; department: ManagementDepartment }) {
  const diets = selectedDiets(meal, department);
  const additions = meal.additions.filter((item) => item.departmentId === department.id);
  const stage = statusOf(diets);
  const menuNames = [...new Set(diets.flatMap(({ diet }) => diet.menuItems.map((item) => item.dishName)))];
  const approved = diets.length > 0 && diets.every(({ diet }) => diet.approved);
  return <aside className="ops-detail" aria-label={`Chi tiết ${department.name}`}><header><div><h2>{department.name}</h2><span translate="no">{department.code}</span></div><strong className={approved ? "detail-state ok" : department.reportId ? "detail-state warning" : "detail-state nurse-missing"}>{approved ? "Đã duyệt" : department.reportId ? "Chờ duyệt" : "Chưa báo"}</strong></header><dl className="ops-people"><div><dt>Người báo</dt><dd>{department.submittedBy ?? "—"}</dd></div><div><dt>Thời gian báo</dt><dd>{department.submittedAt ? dateTime.format(new Date(department.submittedAt)) : "—"}</dd></div></dl>
    <section><h3>Cơ cấu suất ăn</h3>{diets.length ? <table className="ops-diet-table"><thead><tr><th>Chế độ ăn</th><th>Suất</th><th>Tỷ lệ</th></tr></thead><tbody>{diets.map(({ diet, quantity }) => <tr key={diet.id}><td><span translate="no">{diet.code}</span> · {diet.name}</td><td>{number.format(quantity)}</td><td>{department.totalServings ? `${number.format(quantity / department.totalServings * 100)}%` : "—"}</td></tr>)}</tbody><tfoot><tr><th>Tổng cộng</th><td>{department.totalServings === null ? "—" : number.format(department.totalServings)}</td><td>{department.totalServings ? "100%" : "—"}</td></tr></tfoot></table> : <p className="ops-missing">— · Chưa có chi tiết chế độ ăn.</p>}</section>
    <section className="ops-menu"><div><h3>Thực đơn đã duyệt</h3><MealDetailDialog meal={meal} date="Hôm nay" stateLabel={stage ? STATUS_LABEL[stage] : "—"} trigger={<button type="button" disabled={!menuNames.length}>Xem chi tiết</button>}/></div><p>{menuNames.length ? menuNames.join(", ") : "— · Chưa có thực đơn đã duyệt."}</p></section>
    <section><h3>Tiến độ bếp</h3><div className="kitchen-progress">{(["LOCKED", "PREPARING", "PREPARED", "SERVED"] as ManagementStatus[]).map((status, index) => { const activeIndex = stage ? (["LOCKED", "PREPARING", "PREPARED", "SERVED"] as ManagementStatus[]).indexOf(stage) : -1; const done = activeIndex >= index; const active = activeIndex === index; const value = milestone(diets, status); return <div className={`${done ? "done" : ""} ${active ? "active" : ""}`} key={status}><span>{done ? <Check/> : index + 1}</span><strong>{STATUS_LABEL[status]}</strong><small>{value ? time.format(new Date(value.at)) : department.reportId ? <ManualMilestoneDialog meal={meal} department={department} status={status}/> : <span className="missing-static"><AlertTriangle/>—</span>}</small>{value?.source === "ADMIN" && <em>bổ sung thủ công</em>}</div>; })}</div></section>
    <section><h3>Phát sinh liên quan ({additions.length})</h3>{additions.length ? <div className="ops-additions">{additions.map((item) => <article key={item.id}><i/><div><strong>+{number.format(item.quantity)} suất · <span translate="no">{item.dietCode}</span></strong><p>{item.reason}</p><small>{item.submittedBy} · {dateTime.format(new Date(item.submittedAt))}</small><b className={`addition-ack ack-${item.ackStatus.toLowerCase()}`}>{ACK_LABEL[item.ackStatus]}</b></div></article>)}</div> : <p className="ops-missing">— · Không có phát sinh ở khoa này.</p>}</section>
  </aside>;
}

export function ManagementBoard({ data }: { data: ManagementDay }) {
  const [now, setNow] = useState(() => new Date(data.generatedAt));
  const [followLifecycle, setFollowLifecycle] = useState(true);
  const [mealId, setMealId] = useState(() => defaultMealId(data));
  const meal = data.meals.find((item) => item.id === mealId) ?? data.meals[0] ?? null;
  const [departmentId, setDepartmentId] = useState(meal?.departments.find((item) => item.reportId)?.id ?? meal?.departments[0]?.id ?? "");
  const department = meal?.departments.find((item) => item.id === departmentId) ?? meal?.departments[0] ?? null;
  const totals = useMemo(() => ({ servings: meal?.plannedServings ?? null, missing: meal ? meal.totalDepartmentCount - meal.reportedDepartmentCount : 0, menus: meal?.unapprovedDiets ?? 0, pending: meal?.additions.filter((item) => item.ackStatus === "PENDING").length ?? 0 }), [meal]);
  const currentMealId = defaultMealId(data, now);
  useEffect(() => { const timer = window.setInterval(() => { const current = new Date(); setNow(current); if (!followLifecycle) return; const activeId = defaultMealId(data, current); if (!activeId || activeId === mealId) return; const next = data.meals.find((item) => item.id === activeId); setMealId(activeId); setDepartmentId(next?.departments.find((item) => item.reportId)?.id ?? next?.departments[0]?.id ?? ""); }, 30_000); return () => window.clearInterval(timer); }, [data, followLifecycle, mealId]);
  if (!meal) return <section className="ops-empty">— · Chưa có bữa ăn trong lịch ngày đã chọn.</section>;
  function chooseMeal(id: string) { const next = data.meals.find((item) => item.id === id); setFollowLifecycle(false); setMealId(id); setDepartmentId(next?.departments.find((item) => item.reportId)?.id ?? next?.departments[0]?.id ?? ""); }
  function returnToCurrent() { const next = data.meals.find((item) => item.id === currentMealId); if (!next) return; setFollowLifecycle(true); setMealId(next.id); setDepartmentId(next.departments.find((item) => item.reportId)?.id ?? next.departments[0]?.id ?? ""); }
  return <section className="ops-command" aria-label="Điều hành suất ăn toàn viện"><MealLifecycle data={data} meal={meal} now={now}/><div className="ops-status-strip"><div><UsersRound/><span><small>Tổng toàn viện</small><strong>{totals.servings === null ? "—" : `${number.format(totals.servings)} suất`}</strong></span></div><div className={totals.missing ? "nurse-missing" : ""}><AlertTriangle/><span><small>Tiến độ khoa</small><strong>{meal.reportedDepartmentCount}/{meal.totalDepartmentCount} khoa đã báo</strong></span></div><div className={totals.menus ? "warning" : ""}><AlertTriangle/><span><small>Thực đơn</small><strong>{totals.menus} chưa duyệt</strong></span></div><div className={totals.pending ? "warning" : ""}><ChefHat/><span><small>Phát sinh</small><strong>{totals.pending} chờ bếp</strong></span></div></div>
    <div className="ops-layout"><div className="ops-master"><div className="meal-tabs-row"><nav className="meal-tabs" role="tablist" aria-label="Chọn bữa">{data.meals.map((item) => { const state = mealState(data, item, now); const isCurrent = item.id === currentMealId; const status = isCurrent ? "Đang diễn ra" : state?.key === "FINISHED" || state?.key === "INCOMPLETE" ? "Kết thúc" : "Chưa tới"; return <button type="button" role="tab" aria-selected={item.id === meal.id} key={item.id} className={`${item.id === meal.id ? "active" : ""} ${isCurrent ? "current" : ""}`} onClick={() => chooseMeal(item.id)}>{item.name}<small>{item.serviceTime} · {status}</small></button>; })}</nav>{!followLifecycle && <button type="button" className="return-current" onClick={returnToCurrent}>Về hiện tại</button>}</div><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th scope="col">Khoa</th><th scope="col">Đã báo</th><th scope="col">Tổng suất</th><th scope="col">Phát sinh</th><th scope="col">Trạng thái</th><th scope="col"><span className="sr-only">Mở</span></th></tr></thead><tbody>{meal.departments.map((item) => { const additions = meal.additions.filter((addition) => addition.departmentId === item.id); const related = selectedDiets(meal, item); const approved = related.length > 0 && related.every(({ diet }) => diet.approved); const active = item.id === department?.id; const select = () => setDepartmentId(item.id); return <tr key={item.id} tabIndex={0} aria-current={active ? "true" : undefined} className={`${active ? "selected" : ""} ${!item.reportId ? "exception" : ""}`} onClick={select} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } }}><th scope="row"><button type="button" tabIndex={-1}><strong>{item.name}</strong><small translate="no">{item.code}</small></button></th><td>{item.reportId ? <span className="report-check"><Check/></span> : <span className="report-alert"><AlertTriangle/></span>}</td><td>{item.totalServings === null ? "—" : number.format(item.totalServings)}</td><td className={additions.length ? "has-addition" : "zero-addition"}>{additions.length}</td><td><span className={`row-state ${!item.reportId ? "nurse-missing" : approved ? "ok" : "warning"}`}>{!item.reportId ? "Chưa báo" : approved ? "Đã duyệt" : "Chờ duyệt"}</span></td><td><ChevronRight/></td></tr>; })}</tbody><tfoot><tr><th scope="row">Tổng cộng</th><td>{meal.reportedDepartmentCount}/{meal.totalDepartmentCount}</td><td>{meal.reportedServings === null ? "—" : number.format(meal.reportedServings)}</td><td>{meal.additions.length}</td><td colSpan={2}/></tr></tfoot></table></div></div>{department && <OperationsDetail meal={meal} department={department}/>}</div>
  </section>;
}
