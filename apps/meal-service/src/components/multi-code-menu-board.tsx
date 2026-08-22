"use client";

import { useMemo, useState } from "react";
import type { DietCodeThresholds } from "@suat-an/nutrition-engine";
import { DietEvaluation } from "./diet-evaluation";
import { MenuFoodSearch } from "./nutrition-2598/MenuFoodSearch";
import { foodToMenuItem, type DishResult, type FoodResult } from "./nutrition-2598/types";
import { calculateMenuTotals, evaluateMenu, type MenuItemInput } from "@/lib/menu-logic";

type Meal = { id: string; code: string; name: string; servings: number; approved: boolean; thresholds: DietCodeThresholds | null; items: MenuItemInput[] };
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

function summary(items: MenuItemInput[]) {
  const totals = calculateMenuTotals(items);
  return totals.energyKcal === null ? "— kcal" : `${number.format(totals.energyKcal)} kcal`;
}

export function MultiCodeMenuBoard({ meals, approveAction }: { meals: Meal[]; approveAction: (data: FormData) => void }) {
  const [menus, setMenus] = useState<Record<string, MenuItemInput[]>>(() => Object.fromEntries(meals.map((meal) => [meal.id, meal.items])));
  const [base, setBase] = useState<MenuItemInput[]>(() => meals.find((meal) => meal.items.length)?.items ?? []);
  const [baseDish, setBaseDish] = useState(() => base[0]?.dishName || "Món 1");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(meals.filter((meal) => !meal.approved).map((meal) => meal.id)));
  const [searchKind, setSearchKind] = useState<"food" | "dish">("dish");
  const eligible = meals.filter((meal) => {
    const items = menus[meal.id] ?? [];
    return selected.has(meal.id) && !meal.approved && items.length > 0 && evaluateMenu(items, meal.thresholds).criteria.every((criterion) => criterion.status === "OK");
  });
  const payload = JSON.stringify(eligible.map((meal) => ({ dietMealId: meal.id, items: menus[meal.id] })));

  function addBaseFood(food: FoodResult) { setBase((rows) => [...rows, foodToMenuItem(food, baseDish)]); }
  function addBaseDish(dish: DishResult) {
    const rows = dish.ingredients.flatMap((ingredient) => ingredient.food ? [foodToMenuItem(ingredient.food, dish.name, ingredient.quantityG)] : []);
    setBase((current) => [...current.filter((row) => row.dishName !== dish.name), ...rows]); setBaseDish(dish.name);
  }
  function applyBase() { setMenus((current) => Object.fromEntries(meals.map((meal) => [meal.id, selected.has(meal.id) && !meal.approved ? base.map((item) => ({ ...item, nutrients: { ...item.nutrients } })) : current[meal.id] ?? []]))); }
  function patchGram(mealId: string, index: number, grams: number) { setMenus((current) => ({ ...current, [mealId]: current[mealId].map((item, itemIndex) => itemIndex === index ? { ...item, grams } : item) })); }
  function removeItem(mealId: string, index: number) { setMenus((current) => ({ ...current, [mealId]: current[mealId].filter((_, itemIndex) => itemIndex !== index) })); }

  return <section className="multi-entry-2598">
    <header className="multi-entry-toolbar"><div><strong>🍽️ Thực đơn nhiều mã</strong><span>Dựng nền một lần, áp dụng rồi chỉnh riêng ngay tại từng mã.</span></div><span>{meals.length} mã · {eligible.length} mã sẵn sàng duyệt</span></header>
    <section className="base-menu-2598"><header><div><strong>Thực đơn nền</strong><span>{base.length} thực phẩm · {summary(base)}</span></div><button type="button" onClick={applyBase} disabled={base.length === 0 || selected.size === 0}>Áp dụng cho {selected.size} mã đã chọn</button></header>
      <div className="base-menu-body"><label>Món đang nhập<input value={baseDish} onChange={(event) => setBaseDish(event.target.value)} maxLength={120}/></label><div className="base-items">{base.map((item, index) => <span key={`${item.itemName}-${index}`}>{item.dishName} › {item.itemName} · {number.format(item.grams)}g <button type="button" onClick={() => setBase((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>×</button></span>)}</div></div>
      <div className="base-search"><div><button type="button" className={searchKind === "food" ? "active" : ""} onClick={() => setSearchKind("food")}>Thực phẩm</button><button type="button" className={searchKind === "dish" ? "active" : ""} onClick={() => setSearchKind("dish")}>Món ăn</button></div><MenuFoodSearch kind={searchKind} onPickFood={addBaseFood} onPickDish={addBaseDish}/><button type="button" disabled title="Sẽ kết nối công cụ AI sau">✨ AI</button></div>
    </section>
    <div className="multi-code-editors">{meals.map((meal) => {
      const items = menus[meal.id] ?? [];
      const evaluation = evaluateMenu(items, meal.thresholds);
      const dishes = [...new Set(items.map((item) => item.dishName || "Món 1"))];
      return <article className={meal.approved ? "code-editor-2598 approved" : "code-editor-2598"} key={meal.id}><header><input type="checkbox" aria-label={`Chọn mã ${meal.code}`} checked={selected.has(meal.id)} disabled={meal.approved} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(meal.id); else next.delete(meal.id); return next; })}/><strong>{meal.code}</strong><span>{meal.name}</span><b>{meal.servings > 0 ? `${meal.servings} suất` : "— suất"}</b><em>{meal.approved ? "Đã duyệt" : summary(items)}</em></header>
        {items.length === 0 ? <div className="code-editor-empty">Chưa có thực đơn. Tick mã rồi áp dụng thực đơn nền.</div> : <div className="code-editor-grid">{dishes.map((dish) => <section key={dish}><header><strong>🍽️ {dish}</strong><span>{items.filter((item) => (item.dishName || "Món 1") === dish).length} TP</span></header>{items.map((item, index) => (item.dishName || "Món 1") === dish && <div className="code-food-row" key={`${item.itemName}-${index}`}><span>{item.itemName}</span><label><input type="number" min="0.01" step="0.01" value={item.grams} disabled={meal.approved} onChange={(event) => patchGram(meal.id, index, Number(event.target.value))}/> g</label><button type="button" disabled={meal.approved} onClick={() => removeItem(meal.id, index)}>×</button></div>)}</section>)}</div>}
        <details className="parallel-evaluation"><summary>Đánh giá mã · {evaluation.criteria.every((criterion) => criterion.status === "OK") ? "Đạt" : "Cần xem"}</summary><DietEvaluation criteria={evaluation.criteria}/></details>
      </article>;
    })}</div>
    <form action={approveAction} className="multi-approve-bar"><input type="hidden" name="menus" value={payload}/><span><strong>{eligible.length} mã sẽ được duyệt</strong><small>Mỗi mã đóng snapshot và AuditLog riêng.</small></span><button disabled={eligible.length === 0}>Duyệt hàng loạt các mã đã chọn</button></form>
  </section>;
}
