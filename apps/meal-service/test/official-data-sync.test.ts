import assert from "node:assert/strict";
import test from "node:test";
import {
  RNI_ITEM_DELAY_MAX_MS,
  RNI_ITEM_DELAY_MIN_MS,
  RNI_RETRY_DELAYS_MS,
  RNI_SYNC_PAGE_SIZE,
  importSourceFromSyncSource,
  retryDelayMs,
  rniItemDelayMs,
  sourceForImportUpdate,
} from "../src/lib/official-data-sync";
import { serializeFoodSearchResult, serializeDishSearchResult } from "../src/lib/menu-search-result";

test("RNI nghỉ ngẫu nhiên trong khoảng an toàn giữa từng món", () => {
  assert.equal(RNI_SYNC_PAGE_SIZE, 1);
  assert.equal(rniItemDelayMs(0), RNI_ITEM_DELAY_MIN_MS);
  assert.equal(rniItemDelayMs(1), RNI_ITEM_DELAY_MAX_MS);
  assert.equal(rniItemDelayMs(-1), RNI_ITEM_DELAY_MIN_MS);
  assert.equal(rniItemDelayMs(2), RNI_ITEM_DELAY_MAX_MS);
});

test("RNI giãn nhịp tăng dần khi nguồn giới hạn hoặc lỗi", () => {
  assert.deepEqual(RNI_RETRY_DELAYS_MS, [5_000, 15_000, 30_000, 60_000]);
  assert.equal(retryDelayMs(5_000, 20_000), 20_000);
  assert.equal(retryDelayMs(15_000, null), 15_000);
});

test("official import source is assigned from trusted sync job origin", () => {
  assert.equal(importSourceFromSyncSource("RNI_DISH"), "RNI");
  assert.equal(importSourceFromSyncSource("VDD_FOOD"), "VDD");
  assert.equal(importSourceFromSyncSource("VDD_DISH"), "VDD");
  assert.equal(importSourceFromSyncSource("USDA"), "USDA");
  assert.equal(importSourceFromSyncSource("Open Food Facts"), "Open Food Facts");
});

test("import source policy fills missing source and preserves existing provenance", () => {
  assert.deepEqual(sourceForImportUpdate(null, "RNI"), { source: "RNI", action: "assigned-missing-source" });
  assert.deepEqual(sourceForImportUpdate("", "VDD"), { source: "VDD", action: "assigned-missing-source" });
  assert.deepEqual(sourceForImportUpdate("RNI", "RNI"), { source: "RNI", action: "same-source" });
  assert.deepEqual(sourceForImportUpdate("rni", "RNI"), { source: "RNI", action: "same-source" });
  assert.deepEqual(sourceForImportUpdate("RNI", "VDD"), { source: "RNI", action: "preserved-conflicting-source" });
});

test("import result remains JSON safe and source badges see imported provenance", () => {
  const food = serializeFoodSearchResult({ id: "food-1", name: "Milk", source: importSourceFromSyncSource("RNI_DISH"), energyKcal: "66" });
  const dish = serializeDishSearchResult({ id: "dish-1", name: "Soup", source: importSourceFromSyncSource("VDD_DISH"), ingredients: [{ id: "i-1", foodNameRaw: "Milk", quantityG: 100, food }] });
  assert.equal(food.sourceBadge, "RNI");
  assert.equal(dish.sourceBadge, "RNI + VDD");
  assert.doesNotThrow(() => JSON.stringify({ food, dish }));
  assert.equal(food.energyKcal, 66);
});
