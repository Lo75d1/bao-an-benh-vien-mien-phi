import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MenuEditor } from "@/components/menu-editor";
import { getSessionUser } from "@/lib/auth";
import { parseMenuItems } from "@/lib/menu-logic";
import { prisma } from "@/lib/prisma";
import { approveMenuAction, deleteTemplateAction, saveTemplateAction } from "./actions";

function thresholdsOf(code: { energyKcalMin: number | null; energyKcalMax: number | null; proteinGMin: number | null; proteinGMax: number | null; lipidGMin: number | null; lipidGMax: number | null; glucidGMin: number | null; glucidGMax: number | null; sodiumMgMin: number | null; sodiumMgMax: number | null; potassiumMgMin: number | null; potassiumMgMax: number | null; waterGMin: number | null; waterGMax: number | null; mealsMin: number | null; mealsMax: number | null } | null) {
  if (!code) return null;
  return { energyKcalMin: code.energyKcalMin, energyKcalMax: code.energyKcalMax, proteinGMin: code.proteinGMin, proteinGMax: code.proteinGMax, lipidGMin: code.lipidGMin, lipidGMax: code.lipidGMax, glucidGMin: code.glucidGMin, glucidGMax: code.glucidGMax, sodiumMgMin: code.sodiumMgMin, sodiumMgMax: code.sodiumMgMax, potassiumMgMin: code.potassiumMgMin, potassiumMgMax: code.potassiumMgMax, waterGMin: code.waterGMin, waterGMax: code.waterGMax, mealsMin: code.mealsMin, mealsMax: code.mealsMax };
}

export const dynamic = "force-dynamic";
export default async function MenuPage({ searchParams }: { searchParams: Promise<{ meal?: string; saved?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "DIETITIAN") redirect("/");
  const params = await searchParams;
  const [meals, foods, templates] = await Promise.all([
    prisma.dietMeal.findMany({ where: { voidedAt: null }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { mealEvent: { mealType: { sortOrder: "asc" } } }, { dietType: { sortOrder: "asc" } }], include: { mealEvent: { include: { mealType: true } }, dietType: { include: { dietCodeRef: true } } } }),
    prisma.food.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, sodiumMg: true, potassiumMg: true, waterG: true } }),
    prisma.menuTemplate.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, include: { items: { orderBy: { id: "asc" } }, _count: { select: { usedByMeals: true } } } }),
  ]);
  const selected = meals.find((meal) => meal.id === params.meal) ?? meals[0];
  const message = params.saved === "approved" ? "Đã duyệt thực đơn và đóng băng snapshot." : params.saved === "template" ? "Đã lưu mẫu cá nhân." : params.saved === "deleted" ? "Đã xóa mẫu chưa sử dụng." : null;
  return <AppShell user={user}><main className="workspace menu-page">
    <div className="page-heading"><div><p className="eyebrow">Lên thực đơn</p><h1>Chuẩn bị thực đơn để chuyển sang báo ăn</h1></div><p className="scope-note">Màn nghiệp vụ NVDD · desktop</p></div>
    {message && <p className="success-banner" role="status">{message}</p>}
    {meals.length === 0 || !selected ? <section className="empty-state"><strong>Chưa có bữa và chế độ ăn để lên thực đơn.</strong><p>Khởi tạo lịch tuần trước, sau đó quay lại màn này.</p></section> : <>
      <form className="menu-selector" method="get"><label>Ngày · bữa · đường ăn · chế độ<select name="meal" defaultValue={selected.id}>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.mealEvent.mealDate.toISOString().slice(0, 10)} · {meal.mealEvent.mealType.name} · {meal.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"} · {meal.dietType.code}</option>)}</select></label><button className="secondary-button">Mở thực đơn</button></form>
      <div className="selected-context"><div><span>Ngày / bữa</span><strong>{selected.mealEvent.mealDate.toISOString().slice(0, 10)} · {selected.mealEvent.mealType.name}</strong></div><div><span>Đường ăn</span><strong>{selected.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"}</strong></div><div><span>Chế độ</span><strong>{selected.dietType.code} · {selected.dietType.name}</strong></div><div><span>Trạng thái</span><strong>{selected.approvedAt ? "Đã duyệt" : "Chưa duyệt"}</strong></div></div>
      <MenuEditor dietMeal={{ id: selected.id, dietTypeId: selected.dietTypeId, feedingRoute: selected.feedingRoute, existing: parseMenuItems(selected.menuSnapshotJson) }} foods={foods.map((food) => ({ id: food.id, name: food.name, wastePercent: food.wastePercent, nutrients: { energyKcal: food.energyKcal, proteinG: food.proteinG, lipidG: food.lipidG, glucidG: food.glucidG, sodiumMg: food.sodiumMg, potassiumMg: food.potassiumMg, waterG: food.waterG } }))} thresholds={thresholdsOf(selected.dietType.dietCodeRef)} templates={templates.map((template) => ({ id: template.id, label: template.name, items: template.items.map((item) => ({ foodId: item.foodId, itemName: item.itemName, grams: Number(item.grams), wastePercent: item.wastePercent === null ? null : Number(item.wastePercent) })) }))} copies={meals.filter((meal) => meal.id !== selected.id && meal.menuSnapshotJson !== null).map((meal) => ({ id: meal.id, label: `${meal.mealEvent.mealDate.toISOString().slice(0, 10)} · ${meal.mealEvent.mealType.name} · ${meal.dietType.code}`, items: parseMenuItems(meal.menuSnapshotJson) }))} approveAction={approveMenuAction} saveTemplateAction={saveTemplateAction}/>
      <section className="template-library"><div className="panel-title"><div><p className="eyebrow">Kho mẫu cá nhân</p><h2>Mẫu của {user.displayName}</h2></div><span>{templates.length || "—"} mẫu</span></div>{templates.length === 0 ? <p className="muted-copy">Chưa có mẫu. Nhập thực đơn phía trên rồi chọn “Lưu làm mẫu”.</p> : <div className="template-list">{templates.map((template) => <div className="template-line" key={template.id}><div><strong>{template.name}</strong><span>{template.items.length} thực phẩm · {template._count.usedByMeals ? `đã dùng ${template._count.usedByMeals} lần` : "chưa dùng"}</span></div><form action={deleteTemplateAction}><input type="hidden" name="templateId" value={template.id}/><button className="remove-button" disabled={template._count.usedByMeals > 0} title={template._count.usedByMeals ? "Mẫu đã dùng không thể xóa" : "Xóa mẫu"}>Xóa</button></form></div>)}</div>}</section>
    </>}
  </main></AppShell>;
}
