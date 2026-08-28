import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessMenuDataQuality, type MenuItemInput } from "../src/lib/menu-logic";

const item = (nutrients: MenuItemInput["nutrients"]): MenuItemInput => ({ foodId: null, itemName: "Gao", dishName: "Com", grams: 100, wastePercent: 0, nutrients });

describe("menu data quality", () => {
  it("warns but allows partial nutrition", () => {
    assert.equal(assessMenuDataQuality([item({ energyKcal: 130, proteinG: 2, lipidG: null, glucidG: 28, sodiumMg: null, potassiumMg: null, waterG: null })]).level, "WARNING");
  });

  it("blocks when no essential evaluation basis exists", () => {
    assert.equal(assessMenuDataQuality([item({ energyKcal: null, proteinG: null, lipidG: null, glucidG: null, sodiumMg: 1, potassiumMg: 2, waterG: 60 })]).level, "BLOCKED");
  });
});
