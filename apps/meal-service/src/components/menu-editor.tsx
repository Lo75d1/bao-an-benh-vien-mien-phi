"use client";

import { useMemo, useState } from "react";
import type { DietCodeThresholds } from "@suat-an/nutrition-engine";
import { ConfirmSubmitButton } from "./confirm-submit-button";
import { DietEvaluation } from "./diet-evaluation";
import { calculateMenuTotals, evaluateMenu, type MenuItemInput, type MenuNutrientKey } from "@/lib/menu-logic";

type FoodOption = { id: string; name: string; wastePercent: number | null; nutrients: Record<MenuNutrientKey, number | null> };
type SourceItem = { foodId: string | null; itemName: string; dishName?: string; grams: number; wastePercent: number | null };
type Source = { id: string; label: string; items: SourceItem[] };
const EMPTY_NUTRIENTS = { energyKcal: null, proteinG: null, lipidG: null, glucidG: null, sodiumMg: null, potassiumMg: null, waterG: null };
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

function normalize(value: string) {
  return value.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

export function MenuEditor({ dietMeal, foods, thresholds, templates, copies, approveAction, saveTemplateAction }: { dietMeal: { id: string; dietTypeId: string; feedingRoute: "NORMAL" | "SONDE"; approved?: boolean; existing: SourceItem[] }; foods: FoodOption[]; thresholds: DietCodeThresholds | null; templates: Source[]; copies: Source[]; approveAction: (data: FormData) => void; saveTemplateAction: (data: FormData) => void }) {
  const hydrate = (rows: SourceItem[]): MenuItemInput[] => rows.map((row) => { const food = foods.find((item) => item.id === row.foodId); return { ...row, dishName: row.dishName || "Món 1", nutrients: food?.nutrients ?? EMPTY_NUTRIENTS }; });
  const [items, setItems] = useState<MenuItemInput[]>(() => hydrate(dietMeal.existing));
  const [activeDish, setActiveDish] = useState(() => dietMeal.existing[0]?.dishName || "Món 1");
  const [newDish, setNewDish] = useState("");
  const [emptyDishes, setEmptyDishes] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searchKind, setSearchKind] = useState<"food" | "dish">("food");
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [sourceTemplateId, setSourceTemplateId] = useState("");
  const dishes = useMemo(() => [...new Set([...items.map((item) => item.dishName || "Món 1"), ...emptyDishes])], [items, emptyDishes]);
  const totals = useMemo(() => calculateMenuTotals(items), [items]);
  const evaluation = useMemo(() => evaluateMenu(items, thresholds), [items, thresholds]);
  const visibleFoods = useMemo(() => { const q = normalize(query.trim()); if (!q) return []; return foods.filter((food) => normalize(food.name).includes(q)).slice(0, 8); }, [foods, query]);
  const encoded = JSON.stringify(items);

  function loadSource(source: Source | undefined, template = false) {
    if (!source) return;
    const next = hydrate(source.items);
    setItems(next); setActiveDish(next[0]?.dishName || "Món 1"); setSourceTemplateId(template ? source.id : "");
  }
  function addDish() {
    const name = newDish.trim(); if (!name) return;
    setEmptyDishes((rows) => rows.includes(name) ? rows : [...rows, name]);
    setActiveDish(name); setNewDish("");
  }
  function addFood(food: FoodOption) {
    const dishName = activeDish || "Món 1";
    setItems((rows) => [...rows, { foodId: food.id, itemName: food.name, dishName, grams: 100, wastePercent: food.wastePercent, nutrients: food.nutrients }]);
    setQuery("");
  }
  function removeDish(name: string) {
    setItems((rows) => rows.filter((item) => (item.dishName || "Món 1") !== name));
    setEmptyDishes((rows) => rows.filter((dish) => dish !== name));
    const next = dishes.find((dish) => dish !== name) || "Món 1"; setActiveDish(next);
  }
  function addManualFood() {
    const itemName = manualName.trim(); if (!itemName) return;
    setItems((rows) => [...rows, { foodId: null, itemName, dishName: activeDish || "Món 1", grams: 100, wastePercent: null, nutrients: EMPTY_NUTRIENTS }]);
    setEmptyDishes((rows) => rows.filter((dish) => dish !== activeDish)); setManualName(""); setShowManual(false);
  }

  return <form className="menu-workbench ration-workbench">
    <input type="hidden" name="dietMealId" value={dietMeal.id}/><input type="hidden" name="dietTypeId" value={dietMeal.dietTypeId}/><input type="hidden" name="feedingRoute" value={dietMeal.feedingRoute}/><input type="hidden" name="sourceTemplateId" value={sourceTemplateId}/><input type="hidden" name="items" value={encoded}/>
    {dietMeal.approved && <p className="snapshot-notice">Snapshot đã được đóng băng. Copy sang một bữa chưa duyệt nếu cần chỉnh sửa.</p>}
    <div className="source-toolbar"><button type="button" className="secondary-button" onClick={() => { setItems([]); setActiveDish("Món 1"); setSourceTemplateId(""); }}>Tạo mới</button><label>Lấy mẫu<select defaultValue="" onChange={(event) => loadSource(templates.find((item) => item.id === event.target.value), true)}><option value="">Chọn mẫu…</option>{templates.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label><label>Copy thực đơn<select defaultValue="" onChange={(event) => loadSource(copies.find((item) => item.id === event.target.value))}><option value="">Chọn ngày khác…</option>{copies.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label></div>
    <div className="ration-summary-strip"><dl className="macro-summary"><div><dt>Năng lượng</dt><dd>{totals.energyKcal === null ? "—" : number.format(totals.energyKcal)} <small>kcal</small></dd></div><div><dt>Đạm</dt><dd>{totals.proteinG === null ? "—" : number.format(totals.proteinG)} <small>g</small></dd></div><div><dt>Béo</dt><dd>{totals.lipidG === null ? "—" : number.format(totals.lipidG)} <small>g</small></dd></div><div><dt>Bột đường</dt><dd>{totals.glucidG === null ? "—" : number.format(totals.glucidG)} <small>g</small></dd></div></dl><details className="recommendation-drawer"><summary>Khuyến nghị</summary><DietEvaluation criteria={evaluation.criteria}/></details></div>
    <div className="ration-layout ration-layout-2598">
      <aside className="dish-tree" aria-label="Cây món ăn"><div className="panel-title"><div><p className="eyebrow">Bữa đang chọn</p><h2>Món ăn</h2></div><span>{dishes.length || "—"} món</span></div><div className="dish-tree-list">{dishes.map((dish) => { const dishItems = items.filter((item) => (item.dishName || "Món 1") === dish); const kcal = calculateMenuTotals(dishItems).energyKcal; return <button type="button" key={dish} className={activeDish === dish ? "dish-node active" : "dish-node"} onClick={() => setActiveDish(dish)}><span><strong>{dish}</strong><small>{dishItems.length} thực phẩm</small></span><em>{kcal === null ? "—" : `${number.format(kcal)} kcal`}</em></button>; })}</div><div className="add-dish"><input value={newDish} onChange={(event) => setNewDish(event.target.value)} placeholder="Tên món mới" maxLength={120}/><button type="button" onClick={addDish}>+ Thêm món</button></div></aside>
      <section className="ration-entry" aria-labelledby="ration-entry-title"><div className="panel-title"><div><p className="eyebrow">Thành phần món đang chọn</p><h2 id="ration-entry-title">{activeDish}</h2></div>{items.some((item) => (item.dishName || "Món 1") === activeDish) && <button type="button" className="remove-button" onClick={() => removeDish(activeDish)}>Xóa món</button>}</div>
        <div className="ingredient-table"><div className="ingredient-head"><span>Thực phẩm</span><span>Sống sạch (g)</span><span>Lượng mua</span><span></span></div>{items.map((item, index) => (item.dishName || "Món 1") === activeDish && <div className="ingredient-row" key={`${index}-${item.foodId}`}><strong>{item.itemName}</strong><input className="tabular" aria-label={`Gram ${item.itemName}`} type="number" min="0.01" step="0.01" value={item.grams} onChange={(event) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, grams: Number(event.target.value) } : row))}/><span className="tabular waste-value">{item.wastePercent === null ? "—" : `${number.format(item.grams / (1 - item.wastePercent / 100))} g`}</span><button type="button" className="remove-button" onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))}>Xóa</button></div>)}</div>
        {!items.some((item) => (item.dishName || "Món 1") === activeDish) && <div className="menu-empty"><strong>Chưa có thực phẩm trong {activeDish}</strong><span>Dùng thanh tìm kiếm phía dưới để thêm; dinh dưỡng tính trên gram sống sạch.</span></div>}
      </section>
    </div>
    <div className="ration-command-bar"><p>Đang thêm vào: <strong>{activeDish}</strong></p>{showManual && <div className="manual-food-entry"><input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Tên thực phẩm dùng tạm" autoFocus/><button type="button" onClick={addManualFood}>Thêm vào món</button><button type="button" onClick={() => setShowManual(false)}>Đóng</button></div>}<div className="command-row"><button type="button" className={searchKind === "food" ? "active" : ""} onClick={() => setSearchKind("food")}>Thực phẩm</button><button type="button" className={searchKind === "dish" ? "active" : ""} onClick={() => setSearchKind("dish")}>Món ăn</button><div className="command-search"><input id="menu-food-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchKind === "food" ? "Tìm thực phẩm; gõ không dấu được" : "Nhập tên món mới rồi bấm Thêm món"} autoComplete="off"/>{searchKind === "food" && query.trim() && <div className="food-results">{visibleFoods.length ? visibleFoods.map((food) => <button type="button" key={food.id} onClick={() => addFood(food)}><span><strong>{food.name}</strong><small>{food.wastePercent === null ? "Chưa có tỷ lệ thải bỏ" : `Thải bỏ ${food.wastePercent}%`}</small></span><em>+ Thêm</em></button>) : <p>Không tìm thấy thực phẩm phù hợp.</p>}</div>}</div>{searchKind === "dish" && <button type="button" onClick={() => { const name = query.trim(); if (name) { setEmptyDishes((rows) => rows.includes(name) ? rows : [...rows, name]); setActiveDish(name); setQuery(""); } }}>+ Thêm món</button>}<button type="button" onClick={() => setShowManual((value) => !value)}>Nhập tay</button><button type="button" disabled title="Sẽ kết nối công cụ AI sau">AI</button></div></div>
    <div className="menu-actions"><div className="template-save"><input name="templateName" aria-label="Tên mẫu" placeholder="Tên mẫu cá nhân"/><button className="secondary-button" formAction={saveTemplateAction} disabled={items.length === 0}>Lưu làm mẫu</button></div><ConfirmSubmitButton formAction={approveAction} title="Duyệt thực đơn?" description="Thực đơn sẽ được đóng băng thành snapshot và chuyển sang luồng báo ăn." disabled={items.length === 0}>Duyệt &amp; chuyển sang báo ăn</ConfirmSubmitButton></div>
  </form>;
}
