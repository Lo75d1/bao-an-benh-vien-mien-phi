"use client";

import { useEffect, useState, type Ref } from "react";
import type { DishResult, FoodResult } from "./types";
import type { Language } from "@/lib/i18n";

export function MenuFoodSearch({ kind, onPickFood, onPickDish, placeholder, filterIconOnly = false, inputRef, language = "vi" }: { kind: "food" | "dish"; onPickFood?: (food: FoodResult) => void; onPickDish?: (dish: DishResult) => void; placeholder?: string; filterIconOnly?: boolean; inputRef?: Ref<HTMLInputElement>; language?: Language }) {
  const en = language === "en";
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Array<FoodResult | DishResult>>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [foodType, setFoodType] = useState("");
  const [source, setSource] = useState("");
  const [group, setGroup] = useState("");
  const [options, setOptions] = useState<{ sources: string[]; groups: string[] }>({ sources: [], groups: [] });

  useEffect(() => {
    if (kind !== "food") return;
    fetch("/api/foods/filter-options").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setOptions({ sources: data.sources ?? [], groups: data.groups ?? [] })).catch(() => setOptions({ sources: [], groups: [] }));
  }, [kind]);
  useEffect(() => {
    if (!q.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setFailed(false);
      try {
        const params = new URLSearchParams({ q: q.trim(), limit: "30" });
        if (kind === "food") { if (foodType) params.set("type", foodType); if (source) params.set("source", source); if (group) params.set("group", group); }
        const response = await fetch(kind === "food" ? `/api/foods/search?${params}` : `/api/dishes/search?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json(); setItems(data.items ?? []);
      } catch (error) { if ((error as Error).name !== "AbortError") { setFailed(true); setItems([]); } }
      finally { setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q, kind, foodType, source, group]);

  return <div className="search-2598">
    <div className="search-2598-row"><input ref={inputRef} value={q} onChange={(event) => { setQ(event.target.value); if (!event.target.value.trim()) { setItems([]); setFailed(false); } }} placeholder={placeholder ?? (kind === "food" ? (en ? "Search foods to add to a dish…" : "Tìm thực phẩm để thêm vào món…") : (en ? "Search dishes and add their full recipe…" : "Tìm món để thêm cả công thức…"))}/><button type="button" aria-label={en ? "Filters" : "Bộ lọc"} title={en ? "Filters" : "Bộ lọc"} onClick={() => setFiltersOpen((open) => !open)}>{filterIconOnly ? "⚙" : `⚙ ${en ? "Filters" : "Bộ lọc"}`}</button></div>
    {filtersOpen && kind === "food" && <div className="search-2598-filters"><select value={foodType} onChange={(event) => setFoodType(event.target.value)}><option value="">{en ? "All types" : "Mọi loại"}</option><option value="TS">{en ? "Fresh" : "Tươi sống"}</option><option value="CB">{en ? "Processed" : "Chế biến"}</option><option value="MA">{en ? "Dish" : "Món ăn"}</option><option value="SP">{en ? "Product" : "Sản phẩm"}</option></select><select value={source} onChange={(event) => setSource(event.target.value)}><option value="">{en ? "All sources" : "Mọi nguồn"}</option>{options.sources.map((value) => <option key={value}>{value}</option>)}</select><select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">{en ? "All groups" : "Mọi nhóm"}</option>{options.groups.map((value) => <option key={value}>{value}</option>)}</select></div>}
    {q.trim() && <div className="search-2598-results">{loading ? <p>{en ? "Searching…" : "Đang tìm…"}</p> : failed ? <p>{en ? "Unable to connect to search data." : "Không kết nối được dữ liệu tra cứu."}</p> : items.length === 0 ? <p>{en ? "No results found." : "Không tìm thấy kết quả."}</p> : items.map((item) => kind === "food" ? <button type="button" key={item.id} onClick={() => { onPickFood?.(item as FoodResult); setQ(""); }}><span><strong>{item.name}</strong><small>{(item as FoodResult).source || (en ? "Source not recorded" : "Chưa ghi nguồn")} · {(item as FoodResult).energyKcal ?? "—"} kcal/100g</small></span><b>＋ {en ? "Add" : "Thêm"}</b></button> : <button type="button" key={item.id} onClick={() => { onPickDish?.(item as DishResult); setQ(""); }}><span><strong>{item.name}</strong><small>{(item as DishResult).ingredients.filter((ingredient) => ingredient.food).length}/{(item as DishResult).ingredients.length} {en ? "ingredients with data" : "nguyên liệu có dữ liệu"}</small></span><b>＋ {en ? "Add dish" : "Thêm món"}</b></button>)}</div>}
  </div>;
}
