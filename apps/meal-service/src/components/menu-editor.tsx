"use client";
import { useMemo, useState } from "react";
import type { DietCodeThresholds } from "@suat-an/nutrition-engine";
import { DietEvaluation } from "./diet-evaluation";
import { ConfirmSubmitButton } from "./confirm-submit-button";
import { evaluateMenu, type MenuItemInput, type MenuNutrientKey } from "@/lib/menu-logic";

type FoodOption = { id: string; name: string; wastePercent: number | null; nutrients: Record<MenuNutrientKey, number | null> };
type Source = { id: string; label: string; items: Array<{ foodId: string | null; itemName: string; grams: number; wastePercent: number | null }> };
const EMPTY_NUTRIENTS = { energyKcal: null, proteinG: null, lipidG: null, glucidG: null, sodiumMg: null, potassiumMg: null, waterG: null };

export function MenuEditor({ dietMeal, foods, thresholds, templates, copies, approveAction, saveTemplateAction }: { dietMeal: { id: string; dietTypeId: string; feedingRoute: "NORMAL" | "SONDE"; approved?: boolean; existing: Source["items"] }; foods: FoodOption[]; thresholds: DietCodeThresholds | null; templates: Source[]; copies: Source[]; approveAction: (data: FormData) => void; saveTemplateAction: (data: FormData) => void }) {
  const hydrate = (rows: Source["items"]): MenuItemInput[] => rows.map((row) => { const food = foods.find((item) => item.id === row.foodId); return { ...row, nutrients: food?.nutrients ?? EMPTY_NUTRIENTS }; });
  const [items, setItems] = useState<MenuItemInput[]>(() => hydrate(dietMeal.existing));
  const [sourceTemplateId, setSourceTemplateId] = useState("");
  const evaluation = useMemo(() => evaluateMenu(items, thresholds), [items, thresholds]);
  const encoded = JSON.stringify(items);
  const updateFood = (index: number, foodId: string) => { const food = foods.find((item) => item.id === foodId); if (!food) return; setItems((rows) => rows.map((row, i) => i === index ? { ...row, foodId: food.id, itemName: food.name, wastePercent: food.wastePercent, nutrients: food.nutrients } : row)); };
  const loadSource = (source: Source | undefined, template = false) => { if (!source) return; setItems(hydrate(source.items)); setSourceTemplateId(template ? source.id : ""); };
  return <form className="menu-workbench">
    <input type="hidden" name="dietMealId" value={dietMeal.id}/><input type="hidden" name="dietTypeId" value={dietMeal.dietTypeId}/><input type="hidden" name="feedingRoute" value={dietMeal.feedingRoute}/><input type="hidden" name="sourceTemplateId" value={sourceTemplateId}/><input type="hidden" name="items" value={encoded}/>
    {dietMeal.approved && <p className="snapshot-notice">Snapshot đã được đóng băng. Copy sang một bữa chưa duyệt nếu cần chỉnh sửa.</p>}
    <div className="source-toolbar"><button type="button" className="secondary-button" onClick={() => { setItems([]); setSourceTemplateId(""); }}>Tạo mới</button><label>Lấy mẫu<select defaultValue="" onChange={(event) => loadSource(templates.find((item) => item.id === event.target.value), true)}><option value="">Chọn mẫu…</option>{templates.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label><label>Copy thực đơn<select defaultValue="" onChange={(event) => loadSource(copies.find((item) => item.id === event.target.value))}><option value="">Chọn ngày khác…</option>{copies.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label></div>
    <div className="menu-grid"><section className="ingredients-panel" aria-labelledby="ingredients-title"><div className="panel-title"><div><p className="eyebrow">Món / thực phẩm</p><h2 id="ingredients-title">Khối lượng khẩu phần</h2></div><span>{items.length || "—"} dòng</span></div>
      <div className="ingredient-table"><div className="ingredient-head"><span>Thực phẩm</span><span>Gram</span><span>% thải bỏ</span><span></span></div>{items.map((item, index) => <div className="ingredient-row" key={`${index}-${item.foodId}`}><select aria-label={`Thực phẩm dòng ${index + 1}`} value={item.foodId ?? ""} onChange={(event) => updateFood(index, event.target.value)}><option value="">Chọn thực phẩm…</option>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select><input className="tabular" aria-label={`Gram dòng ${index + 1}`} type="number" min="0.01" step="0.01" value={item.grams} onChange={(event) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, grams: Number(event.target.value) } : row))}/><span className="tabular waste-value">{item.wastePercent === null ? "—" : `${item.wastePercent}%`}</span><button type="button" className="remove-button" onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))}>Xóa</button></div>)}</div>
      {items.length === 0 && <div className="menu-empty"><strong>Chưa có thực phẩm</strong><span>Thêm một dòng hoặc lấy từ mẫu cá nhân.</span></div>}<button type="button" className="add-row" onClick={() => setItems((rows) => [...rows, { foodId: null, itemName: "", grams: 100, wastePercent: null, nutrients: EMPTY_NUTRIENTS }])}>+ Thêm thực phẩm</button>
    </section><DietEvaluation criteria={evaluation.criteria}/></div>
    <div className="menu-actions"><div className="template-save"><input name="templateName" aria-label="Tên mẫu" placeholder="Tên mẫu cá nhân"/><button className="secondary-button" formAction={saveTemplateAction} disabled={items.length === 0}>Lưu làm mẫu</button></div><ConfirmSubmitButton formAction={approveAction} title="Duyệt thực đơn?" description="Thực đơn sẽ được đóng băng thành snapshot và chuyển sang luồng báo ăn." disabled={items.length === 0}>Duyệt &amp; chuyển sang báo ăn</ConfirmSubmitButton></div>
  </form>;
}
