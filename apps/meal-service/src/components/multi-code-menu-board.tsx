"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronRight, ClipboardCopy, CopyPlus, GripVertical, Search, ShoppingBasket, Trash2 } from "lucide-react";
import { buildKitchenShoppingList, type DietCodeThresholds } from "@suat-an/nutrition-engine";
import { DietEvaluation } from "./diet-evaluation";
import { MenuFoodSearch } from "./nutrition-2598/MenuFoodSearch";
import { foodToMenuItem, type DishResult, type FoodResult } from "./nutrition-2598/types";
import { calculateMenuTotals, evaluateMenu, type MenuItemInput } from "@/lib/menu-logic";

type Meal = { id: string; dietTypeId: string; code: string; name: string; servings: number; approved: boolean; thresholds: DietCodeThresholds | null; items: MenuItemInput[] };
type Context = { eventId: string; date: string; mealName: string; feedingRoute: "NORMAL" | "SONDE" };
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

function kcal(items: MenuItemInput[]) { const value = calculateMenuTotals(items).energyKcal; return value === null ? "—" : `${number.format(value)} kcal/suất`; }
function clone(items: MenuItemInput[]) { return items.map((item) => ({ ...item, nutrients: { ...item.nutrients } })); }
function snapshot(items: MenuItemInput[]) {
  const groups = new Map<string, Array<{ foodId: string; foodName: string; gramsPerServing: number; wastePercent: number | null }>>();
  for (const item of items) {
    if (!item.foodId) continue;
    const name = item.dishName?.trim() || "Món 1";
    const rows = groups.get(name) ?? [];
    rows.push({ foodId: item.foodId, foodName: item.itemName, gramsPerServing: item.grams, wastePercent: item.wastePercent });
    groups.set(name, rows);
  }
  return { dishes: [...groups].map(([dish, foods]) => ({ dish, foods })) };
}

export function MultiCodeMenuBoard({ meals, context, approveAction }: { meals: Meal[]; context: Context; approveAction: (data: FormData) => void }) {
  const storageKey = `suat-an:menu-drafts:${context.eventId}:${context.feedingRoute}`;
  const [menus, setMenus] = useState<Record<string, MenuItemInput[]>>(() => Object.fromEntries(meals.map((meal) => [meal.id, clone(meal.items)])));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(meals.slice(0, 3).map((meal) => meal.id)));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(meals.filter((meal) => !meal.approved).map((meal) => meal.id)));
  const [activeId, setActiveId] = useState(meals.find((meal) => !meal.approved)?.id ?? meals[0]?.id ?? "");
  const [sourceByMeal, setSourceByMeal] = useState<Record<string, string>>({});
  const [searchKind, setSearchKind] = useState<"food" | "dish">("dish");
  const [shoppingScope, setShoppingScope] = useState<"all" | "code">("all");
  const [showWarnings, setShowWarnings] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const active = meals.find((meal) => meal.id === activeId) ?? meals[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) setMenus((current) => ({ ...current, ...(JSON.parse(saved) as Record<string, MenuItemInput[]>) }));
      } catch { /* Bản nháp hỏng không được làm sập màn nghiệp vụ. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => { if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(menus)); }, [hydrated, menus, storageKey]);

  const eligible = meals.filter((meal) => { const items = menus[meal.id] ?? []; return selected.has(meal.id) && !meal.approved && items.length > 0 && evaluateMenu(items, meal.thresholds).criteria.every((criterion) => criterion.status === "OK"); });
  const payload = JSON.stringify(eligible.map((meal) => ({ dietMealId: meal.id, items: menus[meal.id] })));
  const shopping = useMemo(() => {
    const scopedMeals = shoppingScope === "code" && active ? [active] : meals;
    return buildKitchenShoppingList(context.eventId, context.eventId, scopedMeals.filter((meal) => (menus[meal.id] ?? []).length).map((meal) => ({ id: meal.id, dietTypeId: meal.dietTypeId, dishName: meal.name, snapshotJson: snapshot(menus[meal.id] ?? []) })), scopedMeals.map((meal) => ({ mealTypeId: context.eventId, dietTypeId: meal.dietTypeId, quantity: meal.servings })));
  }, [active, context.eventId, meals, menus, shoppingScope]);
  const missingRows = shopping.incomplete.filter((item) => item.reason.includes("thiếu tỷ lệ") || item.reason.includes("chưa có bản chụp"));
  const totalServings = meals.reduce((sum, meal) => sum + meal.servings, 0);

  function addFood(food: FoodResult) { if (!active || active.approved) return; setMenus((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), foodToMenuItem(food, "Món mới")] })); }
  function addDish(dish: DishResult) { if (!active || active.approved) return; const rows = dish.ingredients.flatMap((ingredient) => ingredient.food ? [foodToMenuItem(ingredient.food, dish.name, ingredient.quantityG)] : []); setMenus((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []).filter((item) => item.dishName !== dish.name), ...rows] })); }
  function copyToSelected(source: Meal) { const sourceItems = menus[source.id] ?? []; if (!sourceItems.length) return; setMenus((current) => { const next = { ...current }; for (const meal of meals) if (selected.has(meal.id) && !meal.approved && meal.id !== source.id) next[meal.id] = clone(sourceItems); return next; }); setSourceByMeal((current) => ({ ...current, ...Object.fromEntries(meals.filter((meal) => selected.has(meal.id) && !meal.approved && meal.id !== source.id).map((meal) => [meal.id, source.code])) })); }
  function patchGram(mealId: string, index: number, grams: number) { setMenus((current) => ({ ...current, [mealId]: (current[mealId] ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, grams } : item) })); }
  function move(mealId: string, direction: -1 | 1) { const index = meals.findIndex((meal) => meal.id === mealId); const target = meals[index + direction]; if (target) { setActiveId(target.id); document.getElementById(`diet-code-${target.id}`)?.focus(); } }

  return <section className="multi-menu-workspace">
    <header className="menu-workspace-context"><div><strong>{context.date} · {context.mealName} · {context.feedingRoute === "SONDE" ? "Nuôi qua sonde" : "Ăn đường miệng"}</strong><span><Check/> Tự lưu trên trình duyệt</span></div><b>{meals.length} mã · {number.format(totalServings)} suất</b><details><summary>Thông tin khuyến nghị ✓</summary><div>{meals.map((meal) => <p key={meal.id}><strong>{meal.code}</strong>{meal.thresholds ? "Đã có ngưỡng đối chiếu" : "— · Chưa có ngưỡng"}</p>)}</div></details><a href="#shopping-panel"><ShoppingBasket/> Tổng hợp đi chợ</a></header>
    <div className="menu-workspace-layout"><div className="diet-code-list">{meals.map((meal, order) => { const items = menus[meal.id] ?? []; const dishes = [...new Set(items.map((item) => item.dishName?.trim() || "Món 1"))]; const isOpen = expanded.has(meal.id); return <article id={`diet-code-${meal.id}`} tabIndex={0} className={`diet-code-workspace ${activeId === meal.id ? "active" : ""}`} key={meal.id} onFocus={() => setActiveId(meal.id)}><header><GripVertical aria-hidden="true"/><span className="keyboard-order"><button type="button" onClick={() => move(meal.id, -1)} aria-label={`Đưa ${meal.code} lên`}>↑</button><button type="button" onClick={() => move(meal.id, 1)} aria-label={`Đưa ${meal.code} xuống`}>↓</button></span><button type="button" className="expand-code" aria-expanded={isOpen} aria-label={`${isOpen ? "Thu" : "Mở"} mã ${meal.code}`} onClick={() => setExpanded((current) => { const next = new Set(current); isOpen ? next.delete(meal.id) : next.add(meal.id); return next; })}>{isOpen ? <ChevronDown/> : <ChevronRight/>}</button><span className="code-order">{order + 1}</span><label><input type="checkbox" checked={selected.has(meal.id)} disabled={meal.approved} onChange={(event) => setSelected((current) => { const next = new Set(current); event.target.checked ? next.add(meal.id) : next.delete(meal.id); return next; })}/><strong>{meal.code}</strong> · {meal.name}</label><b>{meal.servings > 0 ? `${meal.servings} suất` : "— suất"}</b><em>{kcal(items)}</em>{sourceByMeal[meal.id] && <small>Sao chép từ {sourceByMeal[meal.id]}</small>}<button type="button" className="icon-action" aria-label={`Chọn ${meal.code} làm mã nền`} onClick={() => setActiveId(meal.id)}><ClipboardCopy/></button><button type="button" className="icon-action" aria-label={`Nhân bản ${meal.code} sang mã đã chọn`} onClick={() => copyToSelected(meal)} disabled={meal.approved || !items.length}><CopyPlus/></button><button type="button" className="icon-action danger" aria-label={`Xóa bản nháp ${meal.code}`} disabled={meal.approved} onClick={() => setMenus((current) => ({ ...current, [meal.id]: [] }))}><Trash2/></button></header>{isOpen && <div className="dish-cards-workspace">{dishes.map((dish) => { const rows = items.map((item, index) => ({ item, index })).filter(({ item }) => (item.dishName?.trim() || "Món 1") === dish); return <section key={dish}><header><strong>{dish}</strong><span>{kcal(rows.map(({ item }) => item))}</span></header>{rows.map(({ item, index }) => <div key={`${item.itemName}-${index}`}><span>{item.itemName}</span><label><input type="number" min="0.1" step="0.1" value={item.grams} disabled={meal.approved} onChange={(event) => patchGram(meal.id, index, Number(event.target.value))}/> g</label><button type="button" aria-label={`Xóa ${item.itemName}`} disabled={meal.approved} onClick={() => setMenus((current) => ({ ...current, [meal.id]: (current[meal.id] ?? []).filter((_, itemIndex) => itemIndex !== index) }))}>×</button></div>)}</section>; })}<button type="button" className="add-dish-card" onClick={() => setActiveId(meal.id)} disabled={meal.approved}>+ món</button>{!items.length && <p className="empty-code-workspace">Chưa có thực đơn — chọn mã này rồi tìm món ở thanh lệnh bên dưới.</p>}<details className="code-evaluation-workspace"><summary>Đánh giá mã · {evaluateMenu(items, meal.thresholds).criteria.every((criterion) => criterion.status === "OK") ? "Đạt" : "Cần xem"}</summary><DietEvaluation criteria={evaluateMenu(items, meal.thresholds).criteria}/></details></div>}</article>; })}</div>
      <aside id="shopping-panel" className="shopping-workspace"><header><ShoppingBasket/><div><strong>Tổng hợp đi chợ</strong><small>{context.mealName}</small></div></header><div className="shopping-tabs-workspace" role="tablist"><button role="tab" aria-selected={shoppingScope === "all"} className={shoppingScope === "all" ? "active" : ""} onClick={() => setShoppingScope("all")}>Toàn bữa</button><button role="tab" aria-selected={shoppingScope === "code"} className={shoppingScope === "code" ? "active" : ""} onClick={() => setShoppingScope("code")}>Theo mã</button></div>{shoppingScope === "code" && <p className="shopping-code-label">{active?.code ?? "—"}</p>}<div className="shopping-table-workspace"><div><strong>Thực phẩm</strong><strong>Khối lượng mua</strong></div>{shopping.items.map((item) => <div key={item.foodId}><span>{item.foodName}</span><b>{item.rawGrams === null ? "—" : `${number.format(item.rawGrams / 1000)} kg`}</b></div>)}{!shopping.items.length && <p>— · Chưa có dữ liệu để tính.</p>}</div>{missingRows.length > 0 && <div className="shopping-warning-workspace"><button type="button" onClick={() => setShowWarnings((value) => !value)}><AlertTriangle/> {missingRows.length} thực phẩm thiếu tỷ lệ thải bỏ {showWarnings ? "⌃" : "⌄"}</button>{showWarnings && <ul>{missingRows.map((item, index) => <li key={`${item.menuItemId}-${index}`}>{item.reason}</li>)}</ul>}</div>}<p className="shopping-formula-workspace">Khối lượng mua = định lượng sống sạch × số suất, tách theo mã và cộng toàn bữa.</p><form action={approveAction}><input type="hidden" name="menus" value={payload}/><button className="send-kitchen-workspace" disabled={!eligible.length}>Chuyển danh sách sang Bếp · {eligible.length} mã</button></form></aside></div>
    <div className="menu-command-workspace"><strong>Đang chỉnh: {active?.code ?? "—"} · {context.mealName}</strong><button type="button">Bộ lọc</button><button type="button" className={searchKind === "food" ? "active" : ""} onClick={() => setSearchKind("food")}>Thực phẩm</button><button type="button" className={searchKind === "dish" ? "active" : ""} onClick={() => setSearchKind("dish")}>Món ăn</button><div><Search/><MenuFoodSearch kind={searchKind} onPickFood={addFood} onPickDish={addDish} placeholder="VD: cá chép, sữa chua; gõ không dấu được"/></div><button type="button" onClick={() => { const name = window.prompt("Tên thực phẩm nhập tay"); if (name?.trim() && active && !active.approved) setMenus((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), { foodId: null, itemName: name.trim(), dishName: "Món mới", grams: 100, wastePercent: null, nutrients: { energyKcal: null, proteinG: null, lipidG: null, glucidG: null, sodiumMg: null, potassiumMg: null, waterG: null } }] })); }}>Nhập tay</button><button type="button" disabled title="Sẽ kết nối sau">AI</button><button type="button" onClick={() => active && setExpanded((current) => new Set(current).add(active.id))}>Mở mã đang chọn ›</button></div>
  </section>;
}
