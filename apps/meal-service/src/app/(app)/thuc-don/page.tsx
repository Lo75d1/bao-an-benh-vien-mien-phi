import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MultiCodeMenuBoard } from "@/components/multi-code-menu-board";
import { EmptyState } from "@/components/presentation";
import { CalendarDays, CheckCircle2, CircleAlert, LockKeyhole, Utensils } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { hospitalDayKey, mealTimePhase } from "@/lib/meal-events";
import { parseMenuItems } from "@/lib/menu-logic";
import { prisma } from "@/lib/prisma";
import { entryWindowEnd, readOperationalSettings } from "@/lib/settings";
import { formatVnDay } from "@/lib/presentation";
import { readRequestClock } from "@/lib/request-clock";
import { saveMenusAction, saveTemplateAction } from "./actions";
import { readDemoSession } from "@/lib/demo-session";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function thresholdsOf(code: { energyKcalMin: number | null; energyKcalMax: number | null; proteinGMin: number | null; proteinGMax: number | null; lipidGMin: number | null; lipidGMax: number | null; glucidGMin: number | null; glucidGMax: number | null; sodiumMgMin: number | null; sodiumMgMax: number | null; potassiumMgMin: number | null; potassiumMgMax: number | null; waterGMin: number | null; waterGMax: number | null; mealsMin: number | null; mealsMax: number | null } | null) {
  return code ? { ...code } : null;
}

export const dynamic = "force-dynamic";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ meal?: string; saved?: string; route?: string; demoNow?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "DIETITIAN" && user.role !== "ADMIN") redirect("/");
  const params = await searchParams;
  const [settings, clock] = await Promise.all([readOperationalSettings(), readRequestClock(params.demoNow)]);
  let [meals, templates] = await Promise.all([
    prisma.dietMeal.findMany({ where: { voidedAt: null, mealEvent: { mealDate: { lte: entryWindowEnd(clock.now, settings.advanceEntryDays) } }, ...(settings.sondeEnabled ? {} : { feedingRoute: "NORMAL" }) }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { mealEvent: { mealType: { sortOrder: "asc" } } }, { dietType: { sortOrder: "asc" } }], include: { mealEvent: { include: { mealType: true } }, dietType: { include: { dietCodeRef: true } } } }),
    prisma.menuTemplate.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, include: { items: { orderBy: { id: "asc" } } } }),
  ]);
  const demo = await readDemoSession();
  if (demo) meals = meals.map((meal) => { const overlay = demo.state.menus[meal.id] as { menuSnapshotJson?: unknown; evaluationJson?: unknown; patientVisibleNote?: string | null; status?: typeof meal.status } | undefined; return overlay ? { ...meal, menuSnapshotJson: overlay.menuSnapshotJson ?? meal.menuSnapshotJson, evaluationJson: overlay.evaluationJson ?? meal.evaluationJson, patientVisibleNote: overlay.patientVisibleNote ?? null, status: overlay.status ?? meal.status } : meal; });
  if (!params.meal) {
    const today = hospitalDayKey(clock.now);
    const requestedRoute = params.route === "SONDE" ? "SONDE" : "NORMAL";
    const routeMeals = meals.filter((meal) => meal.feedingRoute === requestedRoute);
    const nearestMissing = routeMeals.find((meal) => meal.mealEvent.mealDate.toISOString().slice(0, 10) >= today && parseMenuItems(meal.menuSnapshotJson).length === 0);
    const nearestUpcoming = routeMeals.find((meal) => meal.mealEvent.mealDate.toISOString().slice(0, 10) >= today);
    const target = nearestMissing ?? nearestUpcoming;
    if (target) redirect(`/thuc-don?meal=${encodeURIComponent(target.id)}`);
    redirect("/lich");
  }
  const selected = meals.find((meal) => meal.id === params.meal);
  if (!selected) redirect("/lich");
  const relatedMeals = meals.filter((meal) => meal.mealEventId === selected.mealEventId && meal.feedingRoute === selected.feedingRoute);
  const eventGroups = [...new Map(meals.map((meal) => [meal.mealEventId, meals.filter((item) => item.mealEventId === meal.mealEventId && item.feedingRoute === meal.feedingRoute)])).values()];
  const copyEventIds = [...new Set(meals.filter((meal) => meal.mealEvent.mealDate.toISOString().slice(0, 10) >= settings.dataStartDate && meal.mealEventId !== selected.mealEventId && meal.feedingRoute === selected.feedingRoute && parseMenuItems(meal.menuSnapshotJson).length > 0).map((meal) => meal.mealEventId))].reverse().slice(0, 12);
  const copyGroups = copyEventIds.map((eventId) => meals.filter((meal) => meal.mealEventId === eventId && meal.feedingRoute === selected.feedingRoute));
  const foodIds = [...new Set([...relatedMeals.flatMap((meal) => parseMenuItems(meal.menuSnapshotJson).flatMap((item) => item.foodId ? [item.foodId] : [])), ...copyGroups.flatMap((group) => group.flatMap((meal) => parseMenuItems(meal.menuSnapshotJson).flatMap((item) => item.foodId ? [item.foodId] : []))), ...templates.flatMap((template) => template.items.flatMap((item) => item.foodId ? [item.foodId] : []))])];
  const foods = foodIds.length ? await prisma.food.findMany({ where: { id: { in: foodIds } }, select: { id: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, sodiumMg: true, potassiumMg: true, waterG: true } }) : [];
  const nutrientsByFood = new Map(foods.map((food) => [food.id, { energyKcal: food.energyKcal === null ? null : Number(food.energyKcal), proteinG: food.proteinG === null ? null : Number(food.proteinG), lipidG: food.lipidG === null ? null : Number(food.lipidG), glucidG: food.glucidG === null ? null : Number(food.glucidG), sodiumMg: food.sodiumMg === null ? null : Number(food.sodiumMg), potassiumMg: food.potassiumMg === null ? null : Number(food.potassiumMg), waterG: food.waterG === null ? null : Number(food.waterG) } ]));
  const fallbackNutrients = { energyKcal: null, proteinG: null, lipidG: null, glucidG: null, sodiumMg: null, potassiumMg: null, waterG: null };
  const message = params.saved === "menus" || params.saved === "menu" ? "Đã lưu thực đơn. Hệ thống sẽ tự khóa khi tới giờ chốt." : params.saved === "template" ? "Đã lưu mẫu cá nhân." : null;
  return <AppShell user={user} demoClock={clock.enabled ? { nowIso: clock.now.toISOString(), simulated: clock.simulated } : undefined}><main className="nutrition-menu-page">
    {message ? <p className="success-banner" role="status">{message}</p> : null}
    <section className="nutrition-meal-context" aria-label="Bữa đang lên thực đơn">
      <div><CalendarDays aria-hidden="true"/><span><small>Bữa đang làm · {selected.feedingRoute === "SONDE" ? "Bếp Sonde" : "Bếp ăn thường"}</small><strong>{formatVnDay(selected.mealEvent.mealDate)} · {selected.mealEvent.mealType.name}</strong></span></div>
      <Dialog><DialogTrigger asChild><button type="button" className="secondary-button">Chọn bữa</button></DialogTrigger><DialogContent className="nutrition-meal-dialog"><DialogHeader><DialogTitle>Chọn ngày và bữa cần lên thực đơn</DialogTitle><DialogDescription>Hai lịch ăn thường và Sonde vận hành độc lập. Chọn một ô để chuyển bàn làm việc.</DialogDescription></DialogHeader><nav className="nutrition-route-tabs" aria-label="Chọn đường nuôi"><Link href="/thuc-don?route=NORMAL" aria-current={selected.feedingRoute === "NORMAL" ? "page" : undefined}>Bếp ăn thường</Link>{settings.sondeEnabled ? <Link href="/thuc-don?route=SONDE" aria-current={selected.feedingRoute === "SONDE" ? "page" : undefined}>Bếp Sonde</Link> : null}</nav><div className="nutrition-meal-options">{eventGroups.filter((group) => group[0].feedingRoute === selected.feedingRoute).map((group) => {
        const first = group[0];
        const filled = group.filter((meal) => parseMenuItems(meal.menuSnapshotJson).length > 0).length;
        const phase = mealTimePhase(first.mealEvent.mealDate, first.mealEvent.mealType.cutoffTime, first.mealEvent.mealType.serviceTime, clock.now);
        const locked = phase !== "BEFORE_CUTOFF";
        const complete = filled === group.length;
        return <Link key={first.mealEventId} href={`/thuc-don?meal=${encodeURIComponent(first.id)}`} aria-current={first.mealEventId === selected.mealEventId ? "true" : undefined}><span><strong>{formatVnDay(first.mealEvent.mealDate)}</strong><small>{first.mealEvent.mealType.name}</small></span><span className={complete ? "meal-picker-state complete" : "meal-picker-state missing"}>{complete ? <CheckCircle2 aria-hidden="true"/> : <CircleAlert aria-hidden="true"/>}{filled}/{group.length} mã</span><span className={locked ? "meal-picker-lock locked" : "meal-picker-lock"}>{locked ? <LockKeyhole aria-hidden="true"/> : null}{locked ? "Đã khóa" : "Còn sửa"}</span></Link>;
      })}</div></DialogContent></Dialog>
    </section>
    {!relatedMeals.length ? <EmptyState icon={Utensils} title="Bữa chưa có mã chế độ ăn" description="Quay lại lịch tuần hoặc nhờ quản trị bổ sung mã cho bữa này."/> : <MultiCodeMenuBoard
      context={{ eventId: selected.mealEventId, date: formatVnDay(selected.mealEvent.mealDate), mealName: selected.mealEvent.mealType.name, feedingRoute: selected.feedingRoute }} dataStartDate={settings.dataStartDate}
      meals={relatedMeals.map((meal) => ({ id: meal.id, dietTypeId: meal.dietTypeId, code: meal.dietType.code, name: meal.dietType.name, approved: mealTimePhase(meal.mealEvent.mealDate, meal.mealEvent.mealType.cutoffTime, meal.mealEvent.mealType.serviceTime, clock.now) !== "BEFORE_CUTOFF", patientVisibleNote: meal.patientVisibleNote ?? "", thresholds: thresholdsOf(meal.dietType.dietCodeRef), items: parseMenuItems(meal.menuSnapshotJson).map((item) => ({ ...item, nutrients: item.foodId ? nutrientsByFood.get(item.foodId) ?? fallbackNutrients : fallbackNutrients })) }))}
      copies={copyGroups.map((group) => ({ id: group[0].mealEventId, label: `${formatVnDay(group[0].mealEvent.mealDate)} · ${group[0].mealEvent.mealType.name}`, meals: group.map((meal) => ({ code: meal.dietType.code, items: parseMenuItems(meal.menuSnapshotJson).map((item) => ({ ...item, nutrients: item.foodId ? nutrientsByFood.get(item.foodId) ?? fallbackNutrients : fallbackNutrients })) })) }))}
      templates={templates.map((template) => ({ id: template.id, name: template.name, dietTypeId: template.dietTypeId, items: template.items.map((item) => ({ foodId: item.foodId, itemName: item.itemName, dishName: "Món 1", grams: Number(item.grams), wastePercent: item.wastePercent === null ? null : Number(item.wastePercent), nutrients: item.foodId ? nutrientsByFood.get(item.foodId) ?? fallbackNutrients : fallbackNutrients })) }))}
      saveAction={saveMenusAction}
      saveTemplateAction={saveTemplateAction}
    />}
  </main></AppShell>;
}
