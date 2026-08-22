"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ManagementDay, ManagementDepartment, ManagementDiet, ManagementMeal, ManagementStatus } from "@/lib/management";

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const timeFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const MANAGEMENT_STATUSES: ManagementStatus[] = ["PLANNED", "LOCKED", "PREPARING", "PREPARED", "SERVED"];
const STATUS_LABEL = { PLANNED: "Dự kiến", LOCKED: "Đã chốt", PREPARING: "Đang chuẩn bị", PREPARED: "Đã chuẩn bị", SERVED: "Đã phục vụ" } as const;
const STATUS_CLASS = { PLANNED: "status-planned", LOCKED: "status-locked", PREPARING: "status-preparing", PREPARED: "status-prepared", SERVED: "status-served" } as const;
const CRITERION_LABEL = { OK: "Đạt", LOW: "Thiếu", HIGH: "Vượt", MISSING: "—" } as const;
type ManagementPhase = "REPORTING" | "PREPARING" | "EVIDENCE";

function instant(value: string | null): number | null { if (!value) return null; const result = new Date(value).getTime(); return Number.isNaN(result) ? null : result; }

function selectActiveMeal(meals: ManagementMeal[], now: number, isToday: boolean): ManagementMeal | null {
  if (meals.length === 0) return null;
  if (!isToday) return meals.at(-1) ?? null;
  for (const meal of meals) { const service = instant(meal.serviceAt); if (service !== null && now <= service + 60 * 60 * 1_000) return meal; }
  return meals.at(-1) ?? null;
}

function phaseOf(meal: ManagementMeal, now: number, isToday: boolean): ManagementPhase {
  const cutoff = instant(meal.cutoffAt); const service = instant(meal.serviceAt);
  if (!isToday) return "EVIDENCE";
  if (cutoff !== null && now < cutoff) return "REPORTING";
  if (service !== null && now < service) return "PREPARING";
  return "EVIDENCE";
}

function Missing({ children }: { children: React.ReactNode }) { return <p className="management-empty">— · {children}</p>; }

function DietDetails({ diet, reporter = null }: { diet: ManagementDiet; reporter?: string | null }) {
  return <div className="diet-detail-sections"><dl className="management-people"><div><dt>Người lên thực đơn</dt><dd>{diet.approvedBy ?? "—"}</dd></div><div><dt>Người báo suất</dt><dd>{reporter ?? (diet.reportedBy.length > 0 ? diet.reportedBy.join(", ") : "—")}</dd></div><div><dt>Người chủ bếp</dt><dd>{diet.kitchenLead ?? "—"}</dd></div></dl><section><h3>Món & định lượng</h3>{diet.menuItems.length === 0 ? <Missing>Chưa có snapshot thực đơn.</Missing> : <table className="management-dialog-table"><thead><tr><th scope="col">Món</th><th scope="col">Định lượng</th></tr></thead><tbody>{diet.menuItems.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.name}</td><td>{item.grams === null ? "—" : `${numberFormat.format(item.grams)} g`}</td></tr>)}</tbody></table>}</section><section><h3>Giá trị dinh dưỡng</h3>{diet.criteria.length === 0 ? <Missing>Chưa đủ dữ liệu đánh giá.</Missing> : <div className="nutrition-criteria">{diet.criteria.map((criterion) => <div className={`criterion criterion-${criterion.status.toLowerCase()}`} key={criterion.key}><span>{criterion.label}</span><strong>{CRITERION_LABEL[criterion.status]}</strong><small>{criterion.actual === null ? "—" : `${numberFormat.format(criterion.actual)}${criterion.unit ? ` ${criterion.unit}` : ""}`} / {criterion.target}</small></div>)}</div>}</section></div>;
}

function DietDialog({ diet, reporter = null, evidenceMode = false }: { diet: ManagementDiet; reporter?: string | null; evidenceMode?: boolean }) {
  return <Dialog><DialogTrigger asChild><button type="button" className="management-row-button"><span className="font-medium text-foreground" translate="no">{diet.code} · {diet.name}</span>{evidenceMode ? <span className={diet.evidence.length > 0 ? "report-ok" : "report-missing"}>{diet.evidence.length > 0 ? `${diet.evidence.length} bằng chứng` : "Chưa có"}</span> : <span className={`status-badge ${STATUS_CLASS[diet.status]}`}>{STATUS_LABEL[diet.status]}</span>}<span className="text-right tabular-nums">{diet.servings === null ? "—" : `${numberFormat.format(diet.servings)} suất`}</span></button></DialogTrigger><DialogContent className="management-detail-dialog max-h-[88vh] max-w-3xl gap-3 overflow-y-auto overscroll-contain p-4"><DialogHeader className="pr-8"><DialogTitle><span translate="no">{diet.code}</span> · {diet.name}</DialogTitle><DialogDescription>Chi tiết bữa ăn chỉ đọc.</DialogDescription></DialogHeader><dl className="management-detail-grid"><div><dt>Trạng thái</dt><dd><span className={`status-badge ${STATUS_CLASS[diet.status]}`}>{STATUS_LABEL[diet.status]}</span></dd></div><div><dt>Số suất toàn viện</dt><dd className="tabular-nums">{diet.servings === null ? "—" : `${numberFormat.format(diet.servings)} suất`}</dd></div></dl><DietDetails diet={diet} reporter={reporter} />{evidenceMode ? <section><h3>Bằng chứng bếp</h3>{diet.evidence.length === 0 ? <Missing>Chưa có ảnh bữa hoặc mẫu lưu.</Missing> : <div className="evidence-grid">{diet.evidence.map((item) => <article key={item.id}>{item.publicUrl ? <a href={item.publicUrl} target="_blank" rel="noreferrer"><Image src={item.publicUrl} alt={item.note || (item.kind === "MEAL_PHOTO" ? "Ảnh bữa ăn" : "Ảnh mẫu lưu")} width={320} height={180} unoptimized /></a> : <div className="evidence-unavailable">— · Chưa cấu hình đường dẫn xem ảnh</div>}<div><strong>{item.kind === "MEAL_PHOTO" ? "Ảnh bữa ăn" : "Mẫu lưu"}</strong><span>{dateTimeFormat.format(new Date(item.uploadedAt))} · {item.uploadedBy}</span><p>{item.note ?? "—"}</p></div></article>)}</div>}</section> : null}</DialogContent></Dialog>;
}

function DepartmentDialog({ department, meal }: { department: ManagementDepartment; meal: ManagementMeal }) {
  const reportedDiets = department.lines.flatMap((line) => { const diet = meal.diets.find((item) => item.code === line.dietCode); return diet ? [{ diet, quantity: line.quantity }] : []; });
  return <Dialog><DialogTrigger asChild><button type="button" className="management-row-button"><span className="font-medium text-foreground" translate="no">{department.code} · {department.name}</span><span className={department.reportId ? "report-ok" : "report-missing"}>{department.reportId ? "Đã chốt" : "Chưa chốt"}</span><span className="text-right tabular-nums">{department.totalServings === null ? "—" : `${numberFormat.format(department.totalServings)} suất`}</span></button></DialogTrigger><DialogContent className="management-detail-dialog max-h-[88vh] max-w-3xl gap-3 overflow-y-auto overscroll-contain p-4"><DialogHeader className="pr-8"><DialogTitle><span translate="no">{department.code}</span> · {department.name}</DialogTitle><DialogDescription>{meal.name} · {department.reportId ? `Đã gửi lúc ${department.submittedAt ? timeFormat.format(new Date(department.submittedAt)) : "—"}` : "Chưa có báo suất đã gửi"}.</DialogDescription></DialogHeader><dl className="management-people"><div><dt>Người báo suất</dt><dd>{department.submittedBy ?? "—"}</dd></div><div><dt>Tổng đã báo</dt><dd>{department.totalServings === null ? "—" : `${numberFormat.format(department.totalServings)} suất`}</dd></div></dl>{reportedDiets.length === 0 ? <Missing>Chưa có chi tiết chế độ ăn.</Missing> : reportedDiets.map(({ diet, quantity }) => <section className="department-diet-detail" key={diet.id}><h3><span translate="no">{diet.code}</span> · {diet.name}<strong>{numberFormat.format(quantity)} suất</strong></h3><DietDetails diet={diet} reporter={department.submittedBy} /></section>)}</DialogContent></Dialog>;
}

function MealPanel({ meal, phase }: { meal: ManagementMeal; phase: ManagementPhase }) {
  const phaseCopy = phase === "REPORTING" ? { label: "Trước giờ chốt", title: "Khoa đã chốt suất", description: `Giờ chốt ${meal.cutoffTime || "—"} · Hiện tất cả khoa` } : phase === "PREPARING" ? { label: "Đang chuẩn bị", title: "Tiến độ", description: `Từ giờ chốt ${meal.cutoffTime || "—"} đến giờ phục vụ ${meal.serviceTime || "—"}` } : { label: "Vừa phục vụ", title: "Bằng chứng bếp", description: `Kiểm tra ảnh bữa và mẫu lưu sau giờ phục vụ ${meal.serviceTime || "—"}` };
  return <section className="management-meal" aria-labelledby={`meal-${meal.id}`}><header><div><div className="flex items-center gap-2"><h3 id={`meal-${meal.id}`}>{meal.name}</h3><span className="meal-focus">{phaseCopy.label}</span></div><p>Chốt {meal.cutoffTime || "—"} · Phục vụ {meal.serviceTime || "—"}</p></div>{phase === "PREPARING" ? <div className="status-summary" aria-label="Tổng hợp tiến độ">{MANAGEMENT_STATUSES.map((status) => <span key={status} className={STATUS_CLASS[status]}><b>{meal.statusCounts[status]}</b> {STATUS_LABEL[status]}</span>)}</div> : null}</header><div className="active-phase-heading"><div><h4>{phaseCopy.title}</h4><p>{phaseCopy.description}</p></div><strong className="tabular-nums">{phase === "REPORTING" ? (meal.totalDepartmentCount > 0 ? `${meal.reportedDepartmentCount}/${meal.totalDepartmentCount}` : "—") : meal.totalDiets > 0 ? meal.totalDiets : "—"}</strong></div><div className="management-list active-management-list">{phase === "REPORTING" ? (meal.departments.length === 0 ? <Missing>Chưa có danh mục khoa hoạt động.</Missing> : meal.departments.map((department) => <DepartmentDialog key={department.id} department={department} meal={meal} />)) : (meal.diets.length === 0 ? <Missing>Chưa có chế độ ăn hợp lệ.</Missing> : meal.diets.map((diet) => <DietDialog key={diet.id} diet={diet} evidenceMode={phase === "EVIDENCE"} />))}</div>{phase === "REPORTING" ? <footer><span>Tổng từ báo suất đã gửi</span><strong className="tabular-nums">{meal.reportedServings === null ? "—" : `${numberFormat.format(meal.reportedServings)} suất`}</strong></footer> : null}</section>;
}

export function ManagementBoard({ data }: { data: ManagementDay }) {
  const [now, setNow] = useState(() => new Date(data.generatedAt).getTime());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  const meal = selectActiveMeal(data.meals, now, data.isToday);
  return <section id="xu-ly-hien-tai" className="management-board management-anchor" aria-labelledby="operations-heading"><div className="management-section-heading"><div><p className="eyebrow">Điều hành toàn viện · Tự cập nhật</p><h2 id="operations-heading">Xử lý hiện tại</h2></div><p>Chọn từng dòng để xem chi tiết. Không chỉnh sửa dữ liệu tại đây.</p></div>{meal ? <MealPanel meal={meal} phase={phaseOf(meal, now, data.isToday)} /> : <div className="management-empty management-empty-day">— · Chưa có bữa ăn trong lịch ngày đã chọn.</div>}</section>;
}
