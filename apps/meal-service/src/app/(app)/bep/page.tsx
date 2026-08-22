import { Separator } from "@/components/ui/separator";
import { ChefHat } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { KITCHEN_STATUS_LABEL, nextKitchenStatus, readApprovedKitchenNotes } from "@/lib/kitchen";
import { lockExpiredMealEvent, servingTotal } from "@/lib/late-addition";
import { transitionMealAction } from "./actions";
import { KitchenDialogs } from "./kitchen-dialogs";
import { readKitchenWorkspace } from "./workspace-data";

const dateLabel = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const actionLabel = { PREPARING: "Bắt đầu chuẩn bị", PREPARED: "Xác nhận đã chuẩn bị", SERVED: "Xác nhận đã phục vụ" } as const;
const workspaceStatus = {
  PLANNED: { label: "Chưa tới", className: "upcoming" }, LOCKED: { label: "Chưa tới", className: "upcoming" },
  PREPARING: { label: "Đang chuẩn bị", className: "preparing" }, PREPARED: { label: "Đã chuẩn bị", className: "prepared" },
  SERVED: { label: "Đã phục vụ", className: "served" }, CANCELLED: { label: "Đã hủy", className: "cancelled" },
} as const;

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ updated?: string; storage?: string; meal?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "KITCHEN") redirect("/");
  const query = await searchParams;
  let [workspace, patientNotes] = await Promise.all([readKitchenWorkspace(query.meal), readApprovedKitchenNotes()]);
  if (workspace.selected && await lockExpiredMealEvent(workspace.selected.id, user) > 0) workspace = await readKitchenWorkspace(query.meal);
  const meal = workspace.selected;
  const selectedTotal = meal?.dietMeals.reduce((sum, item) => sum + servingTotal(item.servingsPlanned, meal.additions.filter((addition) => addition.dietTypeId === item.dietTypeId)).total, 0) ?? null;

  return <AppShell user={user}><main className="workspace kitchen-page"><Separator className="page-separator" aria-hidden="true"/>
    <PageHeader eyebrow="Bàn làm việc bếp" title={meal ? `${meal.mealType.name} · ${dateLabel.format(meal.mealDate)}` : "Chưa có bữa cần xử lý"} description="Chọn bữa, kiểm tra số suất và cập nhật tiến độ ngay trên một màn hình." actions={meal ? <p className="scope-note">Phục vụ lúc {meal.mealType.serviceTime} · <strong className="tabular">{selectedTotal === null ? "—" : `${numberFormat.format(selectedTotal)} suất`}</strong></p> : undefined}/>
    {query.updated && <p className="success-banner" role="status" aria-live="polite">{query.updated === "status" ? "Đã cập nhật trạng thái và ghi nhật ký." : query.updated === "addition" ? "Đã xác nhận suất bổ sung và ghi nhật ký." : "Đã lưu bằng chứng và ghi nhật ký."}</p>}
    {query.storage === "unavailable" && <p className="storage-notice" role="status" aria-live="polite">Ảnh đang tạm nằm im vì máy chủ chưa cấu hình nơi lưu. Trạng thái bữa ăn không bị ảnh hưởng.</p>}
    {workspace.events.length > 0 && <nav className="kitchen-meal-selector" aria-label="Chọn bữa ăn">{workspace.events.map((event) => { const state = workspaceStatus[event.status]; const active = event.id === meal?.id; return <a key={event.id} href={`/bep?meal=${encodeURIComponent(event.id)}`} className={active ? "kitchen-meal-option active" : "kitchen-meal-option"} aria-current={active ? "page" : undefined}><span className={`kitchen-meal-dot ${state.className}`} aria-hidden="true"/><span><strong>{event.name}</strong><small>{event.serviceTime}</small></span><em className={state.className}>{state.label}</em></a>; })}</nav>}
    {!meal ? <EmptyState icon={ChefHat} title="Không có dữ liệu bữa ăn" description="Hệ thống không tự tạo bữa hoặc đoán số suất."/> : <>
      <section className="kitchen-command-bar" aria-label="Tóm tắt và công cụ bữa đang chọn"><div><span>Bữa đang chọn</span><strong>{meal.mealType.name}</strong><small>{dateLabel.format(meal.mealDate)} · Phục vụ {meal.mealType.serviceTime}</small></div><div className="kitchen-total"><span>Tổng cần phục vụ</span><strong className="tabular">{selectedTotal === null ? "—" : numberFormat.format(selectedTotal)}</strong><small>suất gồm gốc + bổ sung</small></div><KitchenDialogs additions={meal.additions} evidence={meal.evidence} dietMeals={meal.dietMeals.map((item) => ({ id: item.id, name: item.dietType.name }))} patientNotes={patientNotes.map((note) => ({ id: note.id, note: note.note, departmentName: note.department.name, mealDateLabel: dateLabel.format(note.mealDate) }))}/></section>
      <div className="kitchen-work-grid">
        <section className="kitchen-main-panel" aria-labelledby="serving-heading"><div className="compact-section-head"><div><p className="eyebrow">Số suất & tiến độ</p><h2 id="serving-heading">Theo chế độ ăn</h2></div><span className="tabular">{meal.dietMeals.length} chế độ</span></div>
          {meal.dietMeals.length === 0 ? <p className="panel-empty">— · Chưa có chế độ ăn cho bữa này.</p> : <div className="kitchen-table-scroll"><table className="kitchen-serving-table"><thead><tr><th scope="col">Chế độ ăn</th><th scope="col">Suất gốc</th><th scope="col">Bổ sung</th><th scope="col">Tổng</th><th scope="col">Tiến độ</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{meal.dietMeals.map((item) => {
            const additions = meal.additions.filter((addition) => addition.dietTypeId === item.dietTypeId); const total = servingTotal(item.servingsPlanned, additions); const next = nextKitchenStatus(item.status);
            return <tr key={item.id}><td><strong>{item.dietType.name}</strong><span><span translate="no">{item.dietType.code}</span> · {item.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"}</span></td><td className="numeric">{item.servingsPlanned > 0 ? numberFormat.format(item.servingsPlanned) : "—"}</td><td className="numeric">{total.additions > 0 ? `+${numberFormat.format(total.additions)}` : "—"}</td><td className="numeric total-cell">{item.servingsPlanned > 0 ? numberFormat.format(total.total) : "—"}</td><td><span className={`status status-${item.status.toLowerCase()}`}>{KITCHEN_STATUS_LABEL[item.status]}</span></td><td className="action-cell">{next ? <form action={transitionMealAction}><input type="hidden" name="dietMealId" value={item.id}/><input type="hidden" name="target" value={next}/><button className="compact-action">{actionLabel[next as keyof typeof actionLabel]}</button></form> : <span className="workflow-done">Đã hoàn tất</span>}</td></tr>;
          })}</tbody><tfoot><tr><th scope="row">Tổng suất</th><td className="numeric">{meal.dietMeals.some((item) => item.servingsPlanned > 0) ? numberFormat.format(meal.dietMeals.reduce((sum, item) => sum + item.servingsPlanned, 0)) : "—"}</td><td className="numeric">{meal.additions.length > 0 ? `+${numberFormat.format(meal.additions.reduce((sum, item) => sum + item.quantity, 0))}` : "—"}</td><td className="numeric total-cell">{selectedTotal === null ? "—" : numberFormat.format(selectedTotal)}</td><td colSpan={2}>suất cần phục vụ</td></tr></tfoot></table></div>}
        </section>
        <section className="shopping-panel" aria-labelledby="shopping-heading"><div className="compact-section-head"><div><p className="eyebrow">Đi chợ / xuất dự kiến</p><h2 id="shopping-heading">Thực phẩm cần dùng</h2></div><span>Thực đơn × suất</span></div>{meal.shopping.items.length > 0 ? <div className="kitchen-table-scroll"><table className="shopping-table"><thead><tr><th scope="col">Thực phẩm</th><th scope="col">Ăn được</th><th scope="col">Cần xuất</th></tr></thead><tbody>{meal.shopping.items.map((item) => <tr key={item.foodId}><td>{item.foodName}</td><td className="numeric">{numberFormat.format(item.edibleGrams)} g</td><td className="numeric total-cell">{item.rawGrams === null ? "—" : `${numberFormat.format(item.rawGrams)} g`}</td></tr>)}</tbody></table></div> : <p className="panel-empty">— · Chưa đủ dữ liệu để tính xuất dự kiến.</p>}{meal.shopping.incomplete.length > 0 && <div className="data-warnings" role="alert"><strong>Cần bổ sung dữ liệu</strong><ul>{meal.shopping.incomplete.map((warning, index) => <li key={`${warning.reason}-${index}`}>{warning.reason}</li>)}</ul></div>}</section>
      </div>
    </>}
  </main></AppShell>;
}
