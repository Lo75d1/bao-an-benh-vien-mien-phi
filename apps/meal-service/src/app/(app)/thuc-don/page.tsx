import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MenuEditor } from "@/components/menu-editor";
import { MultiCodeMenuBoard } from "@/components/multi-code-menu-board";
import { DietName, EmptyState, PageHeader } from "@/components/presentation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { parseMenuItems } from "@/lib/menu-logic";
import { prisma } from "@/lib/prisma";
import { entryWindowEnd, readOperationalSettings } from "@/lib/settings";
import { approveMenuAction, deleteTemplateAction, saveTemplateAction } from "./actions";
import { formatVnDay } from "@/lib/presentation";

function thresholdsOf(code: { energyKcalMin: number | null; energyKcalMax: number | null; proteinGMin: number | null; proteinGMax: number | null; lipidGMin: number | null; lipidGMax: number | null; glucidGMin: number | null; glucidGMax: number | null; sodiumMgMin: number | null; sodiumMgMax: number | null; potassiumMgMin: number | null; potassiumMgMax: number | null; waterGMin: number | null; waterGMax: number | null; mealsMin: number | null; mealsMax: number | null } | null) {
  if (!code) return null;
  return { energyKcalMin: code.energyKcalMin, energyKcalMax: code.energyKcalMax, proteinGMin: code.proteinGMin, proteinGMax: code.proteinGMax, lipidGMin: code.lipidGMin, lipidGMax: code.lipidGMax, glucidGMin: code.glucidGMin, glucidGMax: code.glucidGMax, sodiumMgMin: code.sodiumMgMin, sodiumMgMax: code.sodiumMgMax, potassiumMgMin: code.potassiumMgMin, potassiumMgMax: code.potassiumMgMax, waterGMin: code.waterGMin, waterGMax: code.waterGMax, mealsMin: code.mealsMin, mealsMax: code.mealsMax };
}

export const dynamic = "force-dynamic";
export default async function MenuPage({ searchParams }: { searchParams: Promise<{ meal?: string; saved?: string; mode?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "DIETITIAN") redirect("/");
  const params = await searchParams;
  const settings = await readOperationalSettings();
  const [meals, foods, templates, warehouseNotes] = await Promise.all([
    prisma.dietMeal.findMany({ where: { voidedAt: null, mealEvent: { mealDate: { lte: entryWindowEnd(new Date(), settings.advanceEntryDays) } }, ...(settings.sondeEnabled ? {} : { feedingRoute: "NORMAL" }) }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { mealEvent: { mealType: { sortOrder: "asc" } } }, { dietType: { sortOrder: "asc" } }], include: { mealEvent: { include: { mealType: true } }, dietType: { include: { dietCodeRef: true } } } }),
    prisma.food.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, sodiumMg: true, potassiumMg: true, waterG: true } }),
    prisma.menuTemplate.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, include: { items: { orderBy: { id: "asc" } }, _count: { select: { usedByMeals: true } } } }),
    prisma.inventoryTransaction.findMany({ where: { status: "ACTIVE" }, orderBy: { occurredAt: "desc" }, take: 8, select: { id: true, type: true, occurredAt: true, note: true, _count: { select: { lines: true } } } }),
  ]);
  const selected = meals.find((meal) => meal.id === params.meal) ?? meals[0];
  const mode = params.mode === "multiple" ? "multiple" : "single";
  const relatedMeals = selected ? meals.filter((meal) => meal.mealEventId === selected.mealEventId && meal.feedingRoute === selected.feedingRoute) : [];
  const message = params.saved === "approved" ? "Đã duyệt thực đơn và đóng băng snapshot." : params.saved === "template" ? "Đã lưu mẫu cá nhân." : params.saved === "deleted" ? "Đã xóa mẫu chưa sử dụng." : null;
  return <AppShell user={user}><main className="workspace menu-page">
    <PageHeader eyebrow="Bàn làm việc dinh dưỡng" title="Lập thực đơn bệnh viện" description="Chỉnh sâu từng mã hoặc phối hợp nhiều mã trong cùng một bữa để chuẩn bị nguyên liệu." actions={<p className="scope-note"><strong>{meals.filter((meal) => !meal.approvedAt).length}</strong> thực đơn chưa duyệt</p>}/>
    {message && <p className="success-banner" role="status">{message}</p>}
    {meals.length === 0 || !selected ? <EmptyState icon={Utensils} title="Chưa có bữa và chế độ ăn để lên thực đơn" description="Khởi tạo lịch tuần trước, sau đó quay lại màn này."/> : <>
      <nav className="menu-mode-switch" aria-label="Chế độ lập thực đơn"><a className={mode === "single" ? "active" : ""} href={`/thuc-don?mode=single&meal=${selected.id}`}>Một mã</a><a className={mode === "multiple" ? "active" : ""} href={`/thuc-don?mode=multiple&meal=${selected.id}`}>Nhiều mã</a></nav>
      <Card className="menu-context-card"><CardContent><form className="menu-selector" method="get"><input type="hidden" name="mode" value={mode}/><label>{mode === "single" ? "Mã đang xử lý" : "Bữa đang xử lý"}<select name="meal" defaultValue={selected.id}>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.approvedAt ? "✓" : "○"} {formatVnDay(meal.mealEvent.mealDate)} · {meal.mealEvent.mealType.name} · {meal.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"}{mode === "single" ? ` · ${meal.dietType.name} (${meal.dietType.code})` : ""}</option>)}</select></label><button className="secondary-button">Chuyển việc</button></form>
      <div className="selected-context"><div><span>Ngày / bữa</span><strong>{formatVnDay(selected.mealEvent.mealDate)} · {selected.mealEvent.mealType.name}</strong></div><div><span>Đường ăn</span><strong>{selected.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"}</strong></div><div><span>Chế độ</span><strong><DietName name={selected.dietType.name} code={selected.dietType.code}/></strong></div><div><span>Trạng thái</span><Badge variant="outline" className={selected.approvedAt ? "status-badge status-served" : "status-badge status-planned"}>{selected.approvedAt ? "Đã duyệt" : "Chưa duyệt"}</Badge></div></div></CardContent></Card>
      {mode === "single" ? <MenuEditor dietMeal={{ id: selected.id, dietTypeId: selected.dietTypeId, feedingRoute: selected.feedingRoute, approved: Boolean(selected.approvedAt), existing: parseMenuItems(selected.menuSnapshotJson) }} foods={foods.map((food) => ({ id: food.id, name: food.name, wastePercent: food.wastePercent, nutrients: { energyKcal: food.energyKcal, proteinG: food.proteinG, lipidG: food.lipidG, glucidG: food.glucidG, sodiumMg: food.sodiumMg, potassiumMg: food.potassiumMg, waterG: food.waterG } }))} thresholds={thresholdsOf(selected.dietType.dietCodeRef)} templates={templates.map((template) => ({ id: template.id, label: template.name, items: template.items.map((item) => ({ foodId: item.foodId, itemName: item.itemName, grams: Number(item.grams), wastePercent: item.wastePercent === null ? null : Number(item.wastePercent) })) }))} copies={meals.filter((meal) => meal.id !== selected.id && meal.menuSnapshotJson !== null).map((meal) => ({ id: meal.id, label: `${formatVnDay(meal.mealEvent.mealDate)} · ${meal.mealEvent.mealType.name} · ${meal.dietType.name}`, items: parseMenuItems(meal.menuSnapshotJson) }))} approveAction={approveMenuAction} saveTemplateAction={saveTemplateAction}/> : <MultiCodeMenuBoard meals={relatedMeals.map((meal) => ({ id: meal.id, code: meal.dietType.code, servings: meal.servingsPlanned, approved: Boolean(meal.approvedAt), items: parseMenuItems(meal.menuSnapshotJson).map((item) => ({ itemName: item.itemName, dishName: item.dishName, grams: item.grams, wastePercent: item.wastePercent })) }))} warehouseNotes={warehouseNotes.map((entry) => ({ id: entry.id, type: entry.type === "IN" ? "Nhập" : entry.type === "OUT" ? "Xuất" : "Điều chỉnh", occurredAt: formatVnDay(entry.occurredAt), itemCount: entry._count.lines, note: entry.note }))}/>}
      {mode === "single" && <section className="template-library"><div className="panel-title"><div><p className="eyebrow">Kho mẫu cá nhân</p><h2>Mẫu của {user.displayName}</h2></div><span>{templates.length || "—"} mẫu</span></div>{templates.length === 0 ? <p className="muted-copy">Chưa có mẫu. Nhập thực đơn phía trên rồi chọn “Lưu làm mẫu”.</p> : <div className="template-list">{templates.map((template) => <div className="template-line" key={template.id}><div><strong>{template.name}</strong><span>{template.items.length} thực phẩm · {template._count.usedByMeals ? `đã dùng ${template._count.usedByMeals} lần` : "chưa dùng"}</span></div><form action={deleteTemplateAction}><input type="hidden" name="templateId" value={template.id}/><button className="remove-button" disabled={template._count.usedByMeals > 0} title={template._count.usedByMeals ? "Mẫu đã dùng không thể xóa" : "Xóa mẫu"}>Xóa</button></form></div>)}</div>}</section>}
    </>}
  </main></AppShell>;
}
