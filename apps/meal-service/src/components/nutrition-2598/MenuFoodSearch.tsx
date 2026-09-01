"use client";

import { useEffect, useState, type Ref } from "react";
import { getTranslations, readClientLocale } from "@/lib/locale";
import type { DishResult, FoodResult } from "./types";

export function MenuFoodSearch({
  kind,
  onPickFood,
  onPickDish,
  placeholder,
  filterIconOnly = false,
  inputRef,
}: {
  kind: "food" | "dish";
  onPickFood?: (food: FoodResult) => void;
  onPickDish?: (dish: DishResult) => void;
  placeholder?: string;
  filterIconOnly?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const t = getTranslations(readClientLocale()).management.multiCodeMenuBoard;
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
    fetch("/api/foods/filter-options")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setOptions({ sources: data.sources ?? [], groups: data.groups ?? [] }))
      .catch(() => setOptions({ sources: [], groups: [] }));
  }, [kind]);

  useEffect(() => {
    if (!q.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({ q: q.trim(), limit: "30" });
        if (kind === "food") {
          if (foodType) params.set("type", foodType);
          if (source) params.set("source", source);
          if (group) params.set("group", group);
        }
        const response = await fetch(kind === "food" ? `/api/foods/search?${params}` : `/api/dishes/search?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json();
        setItems(data.items ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setFailed(true);
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q, kind, foodType, source, group]);

  const placeholderText =
    placeholder ??
    (kind === "food" ? t.searchFoodPlaceholder : t.searchDishPlaceholder);

  return (
    <div className="search-2598">
      <div className="search-2598-row">
        <input
          ref={inputRef}
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            if (!event.target.value.trim()) {
              setItems([]);
              setFailed(false);
            }
          }}
          placeholder={placeholderText}
        />
        <button
          type="button"
          aria-label={t.searchFilterButtonLabel}
          title={t.searchFilterButtonLabel}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          {filterIconOnly ? "⚙" : `⚙ ${t.searchFilterButtonLabel}`}
        </button>
      </div>
      {filtersOpen && kind === "food" && (
        <div className="search-2598-filters">
          <select value={foodType} onChange={(event) => setFoodType(event.target.value)}>
            <option value="">{t.searchAllFoodTypesLabel}</option>
            <option value="TS">{t.searchFoodTypeFreshLabel}</option>
            <option value="CB">{t.searchFoodTypeProcessedLabel}</option>
            <option value="MA">{t.searchFoodTypeDishLabel}</option>
            <option value="SP">{t.searchFoodTypeProductLabel}</option>
          </select>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">{t.searchAllSourcesLabel}</option>
            {options.sources.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="">{t.searchAllGroupsLabel}</option>
            {options.groups.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      )}
      {q.trim() && (
        <div className="search-2598-results">
          {loading ? (
            <p>{t.searchLoadingLabel}</p>
          ) : failed ? (
            <p>{t.searchFailedLabel}</p>
          ) : items.length === 0 ? (
            <p>{t.searchNoResultsLabel}</p>
          ) : (
            items.map((item) =>
              kind === "food" ? (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    onPickFood?.(item as FoodResult);
                    setQ("");
                  }}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {(item as FoodResult).source || t.searchUnknownSourceLabel} ·{" "}
                      {(item as FoodResult).energyKcal ?? "—"} kcal/100g
                    </small>
                  </span>
                  <b>＋ {t.searchAddFoodButtonLabel}</b>
                </button>
              ) : (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    onPickDish?.(item as DishResult);
                    setQ("");
                  }}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {(item as DishResult).ingredients.filter((ingredient) => ingredient.food).length}/
                      {(item as DishResult).ingredients.length} {t.searchDishIngredientsLabel}
                    </small>
                  </span>
                  <b>＋ {t.searchAddDishButtonLabel}</b>
                </button>
              ),
            )
          )}
        </div>
      )}
    </div>
  );
}
