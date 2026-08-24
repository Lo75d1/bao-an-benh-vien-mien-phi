import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MultiCodeMenuBoard } from "@/components/multi-code-menu-board";
import { EmptyState } from "@/components/presentation";
import { Utensils } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { hospitalDayKey, mealTimePhase } from "@/lib/meal-events";
import { parseMenuItems } from "@/lib/menu-logic";
import { prisma } from "@/lib/prisma";
import { entryWindowEnd, readOperationalSettings } from "@/lib/settings";
import { formatVnDay } from "@/lib/presentation";
import { saveMenusAction, saveTemplateAction } from "./actions";

function thresholdsOf(code: { energyKcalMin: number | null; energyKcalMax: number | null; proteinGMin: number | null; proteinGMax: number | null; lipidGMin: number | null; lipidGMax: number | null; glucidGMin: number | null; glucidGMax: number | null; sodiumMgMin: number | null; sodiumMgMax: number | null; potassiumMgMin: number | null; potassiumMgMax: number | null; waterGMin: number | null; waterGMax: number | null; mealsMin: number | null; mealsMax: number | null } | null) {
  return code ? { ...code } : null;
}

export const dynamic = "force-dynamic";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ meal?: string; saved?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "DIETITIAN") redirect("/");
  const params = await searchParams;
  const settings = await readOperationalSettings();
  const [meals, templates] = await Promise.all([
    prisma.dietMeal.findMany({ where: { voidedAt: null, mealEvent: { mealDate: { lte: entryWindowEnd(new Date(), settings.advanceEntryDays) } }, ...(settings.sondeEnabled ? {} : { feedingRoute: "NORMAL" }) }, orderBy: [{ mealEvent: { mealDate: "asc" } }, { mealEvent: { mealType: { sortOrder: "asc" } } }, { dietType: { sortOrder: "asc" } }], include: { mealEvent: { include: { mealType: true } }, dietType: { include: { dietCodeRef: true } } } }),
    prisma.menuTemplate.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, include: { items: { orderBy: { id: "asc" } } } }),
  ]);
  if (!params.meal) {
    const today = hospitalDayKey(new Date());
    const nearestMissing = meals.find((meal) => meal.mealEvent.mealDate.toISOString().slice(0, 10) >= today && parseMenuItems(meal.menuSnapshotJson).length === 0);
    const nearestUpcoming = meals.find((meal) => meal.mealEvent.mealDate.toISOString().slice(0, 10) >= today);
    const target = nearestMissing ?? nearestUpcoming;
    if (target) redirect(`/thuc-don?meal=${encodeURIComponent(target.id)}`);
    redirect("/lich");
  }
  const selected = meals.find((meal) => meal.id === params.meal);
  if (!selected) redirect("/lich");
  const relatedMeals = meals.filter((meal) => meal.mealEventId === selected.mealEventId && meal.feedingRoute === selected.feedingRoute);
  const foodIds = [...new Set([...relatedMeals.flatMap((meal) => parseMenuItems(meal.menuSnapshotJson).flatMap((item) => item.foodId ? [item.foodId] : [])), ...templates.flatMap((template) => template.items.flatMap((item) => item.foodId ? [item.foodId] : []))])];
  const foods = foodIds.length ? await prisma.food.findMany({ where: { id: { in: foodIds } }, select: { id: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, sodiumMg: true, potassiumMg: true, waterG: true } }) : [];
  const nutrientsByFood = new Map(foods.map((food) => [food.id, { energyKcal: food.energyKcal === null ? null : Number(food.energyKcal), proteinG: food.proteinG === null ? null : Number(food.proteinG), lipidG: food.lipidG === null ? null : Number(food.lipidG), glucidG: food.glucidG === null ? null : Number(food.glucidG), sodiumMg: food.sodiumMg === null ? null : Number(food.sodiumMg), potassiumMg: food.potassiumMg === null ? null : Number(food.potassiumMg), waterG: food.waterG === null ? null : Number(food.waterG) } ]));
  const fallbackNutrients = { energyKcal: null, proteinG: null, lipidG: null, glucidG: null, sodiumMg: null, potassiumMg: null, waterG: null };
  const message = params.saved === "menus" || params.saved === "menu" ? "Đã lưu thực đơn. Hệ thống sẽ tự khóa khi tới giờ chốt." : params.saved === "template" ? "Đã lưu mẫu cá nhân." : null;
  return <AppShell user={user}><main className="nutrition-menu-page">
    {message ? <p className="success-banner" role="status">{message}</p> : null}
    {!relatedMeals.length ? <EmptyState icon={Utensils} title="Bữa chưa có mã chế độ ăn" description="Quay lại lịch tuần hoặc nhờ quản trị bổ sung mã cho bữa này."/> : <MultiCodeMenuBoard
      context={{ eventId: selected.mealEventId, date: formatVnDay(selected.mealEvent.mealDate), mealName: selected.mealEvent.mealType.name, feedingRoute: selected.feedingRoute }}
      meals={relatedMeals.map((meal) => ({ id: meal.id, dietTypeId: meal.dietTypeId, code: meal.dietType.code, name: meal.dietType.name, approved: mealTimePhase(meal.mealEvent.mealDate, meal.mealEvent.mealType.cutoffTime, meal.mealEvent.mealType.serviceTime) !== "BEFORE_CUTOFF", thresholds: thresholdsOf(meal.dietType.dietCodeRef), items: parseMenuItems(meal.menuSnapshotJson).map((item) => ({ ...item, nutrients: item.foodId ? nutrientsByFood.get(item.foodId) ?? fallbackNutrients : fallbackNutrients })) }))}
      templates={templates.map((template) => ({ id: template.id, name: template.name, dietTypeId: template.dietTypeId, items: template.items.map((item) => ({ foodId: item.foodId, itemName: item.itemName, dishName: "Món 1", grams: Number(item.grams), wastePercent: item.wastePercent === null ? null : Number(item.wastePercent), nutrients: item.foodId ? nutrientsByFood.get(item.foodId) ?? fallbackNutrients : fallbackNutrients })) }))}
      saveAction={saveMenusAction}
      saveTemplateAction={saveTemplateAction}
    />}
  </main></AppShell>;
}
