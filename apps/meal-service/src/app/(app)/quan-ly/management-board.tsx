"use client";

/* eslint-disable @next/next/no-img-element -- ảnh bằng chứng dùng URL từ lớp lưu trữ cấu hình */
import Link from "next/link";
import type { Role } from "@prisma/client";
import { CalendarDays, Check, ChevronRight, ClipboardPlus, Image as ImageIcon, LayoutList, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MealLifecycleStrip } from "@/components/meal-lifecycle-strip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ManagementDay, ManagementDiet, ManagementMeal } from "@/lib/management";
import { hospitalDayKey, mealTimePhase, pickLifecycleMeal, rollupMealEventStatus } from "@/lib/meal-events";
import { createAdminAdditionAction } from "./actions";
import type { Language } from "@/lib/i18n";

const number = new Intl.NumberFormat("vi-VN");
const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
const ACK = { PENDING: "Chờ bếp", RECEIVED: "Đã nhận", INSUFFICIENT: "Không đủ", SUBSTITUTE: "Thay thế" } as const;
type ViewMode = "department" | "diet";
const TEXT = {
  vi: {
    addIncident: "Bổ sung phát sinh",
    addIncidentTitle: "Bổ sung phát sinh thay khoa",
    addIncidentDesc: "Nội dung được ghi AuditLog và chuyển tới bếp ở trạng thái chờ xác nhận.",
    incidentButton: "Lưu và chuyển bếp xác nhận",
    detailDepartment: "Chi tiết khoa",
    receiptFull: "Đã nhận đủ",
    receiptShort: (received: number, expected: number) => `Nhận ${received}/${expected} suất`,
    noReceipt: "— · Khoa chưa xác nhận nhận suất.",
    servingsByCode: "Cơ cấu suất ăn",
    quantity: "Suất",
    noData: "— · Chưa có dữ liệu.",
    total: "Tổng",
    noAdditions: "— · Không có phát sinh.",
    detailDiet: "Chi tiết mã chế độ ăn",
    notFinalized: "Chưa chốt",
    finalized: "Đã chốt",
    byDepartment: "Số lượng theo khoa",
    noDeptForCode: "— · Chưa có khoa báo mã này.",
    evidence: "Hình ảnh và bằng chứng bếp",
    noEvidence: "— · Bếp chưa gửi bằng chứng.",
    noMeal: "— · Chưa có bữa ăn trong ngày này.",
    allHospital: "Vận hành toàn viện",
    todayOps: "Vận hành hôm nay",
    byDept: "Theo khoa",
    byDiet: "Theo mã chế độ ăn",
    status: "Trạng thái",
    incidents: "Phát sinh",
    grandTotal: "Tổng cộng",
    reportCount: "khoa",
    reviewMeal: "Xem lại ngày/bữa",
    viewing: "Đang xem",
    past: "Đã qua",
    current: "Hiện tại",
    future: "Tương lai",
    meal: "Bữa",
    now: "Hiện tại",
    currentHospital: "Vận hành toàn viện",
    deptLabel: "Khoa",
    codeLabel: "Mã chế độ ăn",
  },
  en: {
    addIncident: "Add incident",
    addIncidentTitle: "Add incident on behalf of department",
    addIncidentDesc: "The entry is logged to AuditLog and sent to the kitchen as pending confirmation.",
    incidentButton: "Save and send to kitchen",
    detailDepartment: "Department details",
    receiptFull: "Received in full",
    receiptShort: (received: number, expected: number) => `Received ${received}/${expected} servings`,
    noReceipt: "— · The department has not confirmed receipt yet.",
    servingsByCode: "Meal composition",
    quantity: "Servings",
    noData: "— · No data yet.",
    total: "Total",
    noAdditions: "— · No incidents.",
    detailDiet: "Diet code details",
    notFinalized: "Not finalized",
    finalized: "Finalized",
    byDepartment: "Quantity by department",
    noDeptForCode: "— · No department has reported this code yet.",
    evidence: "Kitchen images and evidence",
    noEvidence: "— · The kitchen has not submitted evidence yet.",
    noMeal: "— · No meal for this day yet.",
    allHospital: "Hospital operations",
    todayOps: "Today’s operations",
    byDept: "By department",
    byDiet: "By diet code",
    status: "Status",
    incidents: "Incidents",
    grandTotal: "Grand total",
    reportCount: "departments",
    reviewMeal: "Review day/meal",
    viewing: "Viewing",
    past: "Past",
    current: "Current",
    future: "Future",
    meal: "Meal",
    now: "Current",
    currentHospital: "Hospital operations",
    deptLabel: "Department",
    codeLabel: "Diet code",
  },
} as const;

function pickCurrentManagementMeal(meals: ManagementMeal[], date: string, now: Date, serviceCompletionMinutes: number) {
  const mealDate = new Date(`${date}T00:00:00.000Z`);
  return pickLifecycleMeal(
    meals.map((meal) => ({
      meal,
      mealDate,
      cutoffTime: meal.cutoffTime,
      serviceTime: meal.serviceTime,
      status: rollupMealEventStatus(meal.diets.map((diet) => diet.status)),
    })),
    now,
    serviceCompletionMinutes,
  )?.meal.meal;
}

function AddIncident({ meal, language }: { meal: ManagementMeal; language: Language }) {
  const t = TEXT[language];
  return <Dialog><DialogTrigger asChild><button type="button" className="admin-add-incident"><ClipboardPlus/> {t.addIncident}</button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{t.addIncidentTitle}</DialogTitle><DialogDescription>{t.addIncidentDesc}</DialogDescription></DialogHeader><form action={createAdminAdditionAction} className="admin-incident-form"><input type="hidden" name="mealEventId" value={meal.id}/><label>{t.deptLabel}<select name="departmentId" required>{meal.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>{t.codeLabel}<select name="dietMealId" required>{meal.diets.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>{t.quantity}<input type="number" name="quantity" min="1" step="1" required/></label><label>Lý do<textarea name="reason" minLength={3} maxLength={500} required/></label><button className="primary-action">{t.incidentButton}</button></form></DialogContent></Dialog>;
}

function DepartmentDetail({ meal, id, language }: { meal: ManagementMeal; id: string; language: Language }) {
  const t = TEXT[language];
  const department = meal.departments.find((item) => item.id === id); if (!department) return null;
  const additions = meal.additions.filter((item) => item.departmentId === id);
  return <aside className="admin-serving-detail"><header><div><span>{t.detailDepartment}</span><h2>{department.name}</h2></div><b>{department.reportId ? t.finalized : t.notFinalized}</b></header><div className="admin-detail-scroll"><dl><div><dt>Người báo</dt><dd>{department.submittedBy ?? "—"}</dd></div><div><dt>Thời gian</dt><dd>{department.submittedAt ? dateTime.format(new Date(department.submittedAt)) : "—"}</dd></div></dl><section><h3>{t.receiptShort(department.deliveryReceipt?.receivedQuantity ?? 0, department.deliveryReceipt?.expectedQuantity ?? 0)}</h3>{department.deliveryReceipt ? <article className={department.deliveryReceipt.status === "SHORT" ? "receipt-warning" : "receipt-ok"}><strong>{department.deliveryReceipt.status === "FULL" ? t.receiptFull : t.receiptShort(department.deliveryReceipt.receivedQuantity, department.deliveryReceipt.expectedQuantity)}</strong><p>{department.deliveryReceipt.note ?? "Không có chênh lệch."}</p><small>{department.deliveryReceipt.confirmedBy} · {dateTime.format(new Date(department.deliveryReceipt.confirmedAt))}</small></article> : <p>{t.noReceipt}</p>}</section><section><h3>{t.servingsByCode}</h3><table><thead><tr><th>{t.codeLabel}</th><th>{t.quantity}</th></tr></thead><tbody>{department.lines.length ? department.lines.map((line) => <tr key={line.dietCode}><th>{line.dietCode} · {line.dietName}</th><td>{number.format(line.quantity)}</td></tr>) : <tr><td colSpan={2}>{t.noData}</td></tr>}</tbody><tfoot><tr><th>{t.total}</th><td>{department.totalServings === null ? "—" : number.format(department.totalServings)}</td></tr></tfoot></table></section><section><h3>{t.incidents}</h3>{additions.length ? additions.map((item) => <article key={item.id}><strong>+{item.quantity} suất · {item.dietCode}</strong><p>{item.reason}</p><small>{ACK[item.ackStatus]} · {item.submittedBy}</small></article>) : <p>{t.noAdditions}</p>}</section></div></aside>;
}

function DietDetail({ meal, diet, language }: { meal: ManagementMeal; diet: ManagementDiet; language: Language }) {
  const t = TEXT[language];
  const departments = meal.departments.flatMap((department) => { const line = department.lines.find((item) => item.dietCode === diet.code); return line ? [{ id: department.id, name: department.name, quantity: line.quantity }] : []; });
  return <aside className="admin-serving-detail"><header><div><span>{t.detailDiet}</span><h2>{diet.code} · {diet.name}</h2></div><b>{diet.status === "PLANNED" ? t.notFinalized : t.finalized}</b></header><div className="admin-detail-scroll"><section><h3>{t.byDepartment}</h3><table><thead><tr><th>{t.deptLabel}</th><th>{t.quantity}</th></tr></thead><tbody>{departments.length ? departments.map((item) => <tr key={item.id}><th>{item.name}</th><td>{item.quantity}</td></tr>) : <tr><td colSpan={2}>{t.noDeptForCode}</td></tr>}</tbody></table></section><section><h3>{t.evidence}</h3>{diet.evidence.length ? <div className="admin-evidence-grid">{diet.evidence.map((item) => <article key={item.id}>{item.publicUrl ? <img src={item.publicUrl} alt={`Bằng chứng ${diet.code}`}/> : <span><ImageIcon/>—</span>}<strong>{item.kind === "FOOD_SAMPLE" ? "Ảnh lưu mẫu" : "Ảnh bữa ăn"}</strong><small>{item.uploadedBy} · {dateTime.format(new Date(item.uploadedAt))}</small></article>)}</div> : <p>{t.noEvidence}</p>}</section></div></aside>;
}

function ReviewSchedule({ dates, meals, serviceCompletionMinutes, nowIso, language = "vi" }: { dates: Array<{ value: string; label: string; active: boolean }>; meals: ManagementMeal[]; serviceCompletionMinutes: number; nowIso: string; language?: Language }) {
  const searchParams = useSearchParams();
  const activeDate = dates.find((date) => date.active);
  const now = new Date(nowIso);
  const selectedMeal = meals.find((meal) => meal.serviceTime === searchParams.get("meal"))
    ?? (activeDate ? pickCurrentManagementMeal(meals, activeDate.value, now, serviceCompletionMinutes) : undefined)
    ?? meals.at(-1);
  const selectedMealTime = selectedMeal?.serviceTime ?? "";
  const today = hospitalDayKey(now);
  return <Dialog><DialogTrigger asChild><button type="button" className="admin-review-trigger"><CalendarDays/><span><strong>Xem lại ngày/bữa</strong><small>{activeDate?.label ?? "—"} · {selectedMeal?.name ?? "—"}</small></span></button></DialogTrigger><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>Đang xem: {activeDate?.label ?? "—"} · {selectedMeal?.name ?? "—"}</DialogTitle><DialogDescription>Chọn trực tiếp một ô ngày và bữa. Xám là đã qua, xanh là đang diễn ra, nền sáng là tương lai.</DialogDescription></DialogHeader><div className="admin-review-legend"><span className="past">Đã qua</span><span className="current">Hiện tại</span><span className="future">Tương lai</span></div><div className="admin-review-calendar"><table><thead><tr><th>Bữa</th>{dates.map((date) => { const dayTone = date.value < today ? "past" : date.value === today ? "current" : "future"; return <th className={`${dayTone} ${date.active ? "selected" : ""}`} key={date.value}>{date.label}{date.active ? <small>Đang xem</small> : null}</th>; })}</tr></thead><tbody>{meals.map((meal) => <tr key={meal.serviceTime}><th><strong>{meal.name}</strong><small>{meal.serviceTime}</small></th>{dates.map((date) => { const phase = mealTimePhase(new Date(`${date.value}T00:00:00.000Z`), meal.cutoffTime, meal.serviceTime, now, serviceCompletionMinutes); const tone = phase === "PASSED" ? "past" : phase === "PREPARING" || phase === "SERVING" ? "current" : "future"; const selected = date.active && meal.serviceTime === selectedMealTime; return <td key={date.value}><Link className={`${tone} ${selected ? "selected" : ""}`} aria-current={selected ? "true" : undefined} href={`?date=${date.value}&meal=${encodeURIComponent(meal.serviceTime)}`}><Utensils/><span>{meal.name}</span>{tone === "current" ? <small>Hiện tại</small> : null}</Link></td>; })}</tr>)}</tbody></table></div></DialogContent></Dialog>;
}

export function ManagementBoard({ data, dates, initialMealTime, role, liveClock = true, language = "vi" }: { data: ManagementDay; dates: Array<{ value: string; label: string; active: boolean }>; initialMealTime?: string; role: Role; liveClock?: boolean; language?: Language }) {
  const t = TEXT[language];
  const router = useRouter();
  useEffect(() => { if (!liveClock) return; const timer = window.setInterval(() => router.refresh(), 60_000); return () => window.clearInterval(timer); }, [liveClock, router]);
  const [mode, setMode] = useState<ViewMode>("department");
  const meal = data.meals.find((item) => item.serviceTime === initialMealTime)
    ?? pickCurrentManagementMeal(data.meals, data.date, new Date(data.generatedAt), data.serviceCompletionMinutes)
    ?? data.meals[0];
  const firstId = mode === "department" ? meal?.departments[0]?.id : meal?.diets[0]?.id; const [selectedId, setSelectedId] = useState(""); const activeId = selectedId || firstId || "";
  const totals = useMemo(() => ({ servings: meal?.reportedServings ?? null, additions: meal?.additions.reduce((sum, item) => sum + item.quantity, 0) ?? 0 }), [meal]);
  if (!meal) return <p>{t.noMeal}</p>;
  return <section className="admin-serving-board"><div className="admin-serving-top"><MealLifecycleStrip data={data} role={role} selectedMealId={meal.id} liveClock={liveClock}/><ReviewSchedule dates={dates} meals={data.meals} serviceCompletionMinutes={data.serviceCompletionMinutes} nowIso={data.generatedAt} language={language}/></div><div className="admin-serving-grid"><section className="admin-serving-master"><header><div><span>{t.currentHospital}</span><h1>{t.todayOps}</h1></div><div className="admin-view-switch"><button className={mode === "department" ? "active" : ""} onClick={() => { setMode("department"); setSelectedId(""); }}><LayoutList/>{t.byDept}</button><button className={mode === "diet" ? "active" : ""} onClick={() => { setMode("diet"); setSelectedId(""); }}><Utensils/>{t.byDiet}</button></div>{role === "ADMIN" ? <AddIncident meal={meal} language={language}/> : null}</header><div className="admin-serving-table"><table><thead><tr><th>{mode === "department" ? t.deptLabel : t.codeLabel}</th><th>{t.status}</th><th>{t.quantity}</th><th>{t.incidents}</th><th/></tr></thead><tbody>{mode === "department" ? meal.departments.map((item) => { const additions = meal.additions.filter((addition) => addition.departmentId === item.id); return <tr className={activeId === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)} key={item.id}><th>{item.name}<small>{item.code}</small></th><td>{item.reportId ? <span className="ok"><Check/>Đã chốt</span> : <span>Chưa chốt</span>}</td><td>{item.totalServings ?? "—"}</td><td>{additions.reduce((sum, value) => sum + value.quantity, 0) || "—"}</td><td><ChevronRight/></td></tr>; }) : meal.diets.map((item) => { const additions = meal.additions.filter((addition) => addition.dietCode === item.code); return <tr className={activeId === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)} key={item.id}><th>{item.code}<small>{item.name}</small></th><td>{item.status === "PLANNED" ? t.notFinalized : <span className="ok"><Check/>Đã chốt</span>}</td><td>{item.servings ?? "—"}</td><td>{additions.reduce((sum, value) => sum + value.quantity, 0) || "—"}</td><td><ChevronRight/></td></tr>; })}</tbody><tfoot><tr><th>{t.grandTotal}</th><td>{mode === "department" ? `${meal.reportedDepartmentCount}/${meal.totalDepartmentCount} ${t.reportCount}` : `${meal.diets.length} mã`}</td><td>{totals.servings ?? "—"}</td><td>{totals.additions || "—"}</td><td/></tr></tfoot></table></div></section>{mode === "department" ? <DepartmentDetail meal={meal} id={activeId} language={language}/> : <DietDetail meal={meal} diet={meal.diets.find((item) => item.id === activeId) ?? meal.diets[0]} language={language}/>}</div></section>;
}
