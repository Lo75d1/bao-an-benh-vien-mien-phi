import { ChefHat } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CurrentMealLifecycle } from "@/components/current-meal-lifecycle";
import { EmptyState } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { readApprovedKitchenNotes } from "@/lib/kitchen";
import { lockExpiredMealEvent, servingTotal } from "@/lib/late-addition";
import { hospitalDayKey } from "@/lib/meal-events";
import { formatMass } from "@/lib/presentation";
import { KitchenBoard } from "./kitchen-board";
import { KitchenDialogs } from "./kitchen-dialogs";
import { KitchenHeaderStatus } from "./kitchen-header-status";
import { readKitchenWorkspace } from "./workspace-data";

type SnapshotItem = { itemName?: unknown; dishName?: unknown; grams?: unknown };
function menuItems(value: unknown) {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return [];
  return (value.items as SnapshotItem[]).flatMap((item) => typeof item.itemName === "string" && item.itemName.trim() ? [{ name: item.itemName.trim(), dishName: typeof item.dishName === "string" && item.dishName.trim() ? item.dishName.trim() : "Món 1", grams: typeof item.grams === "number" && Number.isFinite(item.grams) ? item.grams : null }] : []);
}

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ updated?: string; storage?: string; meal?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "KITCHEN") redirect("/");
  const query = await searchParams;
  let [workspace, notes] = await Promise.all([readKitchenWorkspace(query.meal), readApprovedKitchenNotes()]);
  if (workspace.selected && await lockExpiredMealEvent(workspace.selected.id, user) > 0) workspace = await readKitchenWorkspace(query.meal);
  const meal = workspace.selected;
  const updateMessage = query.updated === "prepared" ? "Đã lưu ảnh mẫu và xác nhận toàn bộ bữa đã chuẩn bị xong." : query.updated === "reopened" ? "Đã quay lại trạng thái đang chuẩn bị." : "Đã ghi nhận xử lý của bếp.";

  const tools = meal ? <KitchenDialogs additions={meal.additions} evidence={meal.evidence} dietMeals={meal.dietMeals.map((item) => ({ id: item.id, name: `${item.dietType.code} · ${item.dietType.name}` }))} patientNotes={notes.map((note) => ({ id: note.id, note: note.note, departmentName: note.department.name, mealDateLabel: hospitalDayKey(note.mealDate), acknowledged: note.acknowledged }))}/> : null;
  const serviceAt = meal ? `${hospitalDayKey(meal.mealDate)}T${meal.mealType.serviceTime}:00+07:00` : null;

  return <AppShell user={user} workflowStatus={serviceAt ? <KitchenHeaderStatus serviceAt={serviceAt}/> : undefined}><main className="kitchen-page kitchen-v2">
    <CurrentMealLifecycle role={user.role} selectedMealId={meal?.id}/>
    {query.updated && <p className="success-banner" role="status">{updateMessage}</p>}
    {query.storage === "unavailable" && <p className="storage-notice" role="alert">Máy chủ chưa cấu hình nơi lưu ảnh nên chưa thể hoàn tất bữa.</p>}
    {!meal ? <EmptyState icon={ChefHat} title="Chưa có bữa cần chuẩn bị" description="Hệ thống không tự tạo bữa hoặc đoán số suất."/> : <>
      <KitchenBoard eventId={meal.id} mealName={meal.mealType.name} tools={tools} meals={meal.dietMeals.map((item) => {
        const additions = meal.additions.filter((addition) => addition.dietTypeId === item.dietTypeId && addition.ackStatus === "RECEIVED");
        const totals = servingTotal(item.servingsPlanned, additions);
        const departmentIds = new Set([...meal.reports.filter((report) => report.lines.some((line) => line.dietTypeId === item.dietTypeId)).map((report) => report.departmentId), ...additions.map((addition) => addition.departmentId)]);
        const departments = [...departmentIds].map((departmentId) => { const report = meal.reports.find((value) => value.departmentId === departmentId); const original = report?.lines.find((line) => line.dietTypeId === item.dietTypeId)?.quantity ?? null; const extra = additions.filter((addition) => addition.departmentId === departmentId).reduce((sum, addition) => sum + addition.quantity, 0); return { id: departmentId, name: report?.department.name ?? additions.find((addition) => addition.departmentId === departmentId)?.department.name ?? "—", original, additions: extra || null, total: original === null && !extra ? null : (original ?? 0) + extra }; });
        return { id: item.id, code: item.dietType.code, name: item.dietType.name, planned: item.servingsPlanned > 0 ? item.servingsPlanned : null, additions: totals.additions > 0 ? totals.additions : null, total: item.servingsPlanned > 0 ? totals.total : null, items: menuItems(item.menuSnapshotJson), status: item.status, departments };
      })} shopping={meal.shopping.items.map((item) => ({ foodId: item.foodId, foodName: item.foodName, edible: formatMass(item.edibleGrams), waste: item.wastePercent === null ? "—" : `${item.wastePercent}%`, raw: formatMass(item.rawGrams) }))}/>
    </>}
  </main></AppShell>;
}
