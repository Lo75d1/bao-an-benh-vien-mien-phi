import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dynamicCsv, flattenOfficialSource } from "../src/lib/official-data-export";

describe("official data export", () => {
  it("keeps unknown nested and micronutrient source fields", () => {
    const raw = { code: "VDD-1", nutrition: [{ name: "Canxi", unit: "mg", value: 12 }, { name: "Vitamin B12", unit: "mcg", value: 0.4 }], metadata: { publishedYear: 2026 } };
    const flat = flattenOfficialSource(raw);
    assert.equal(flat["Nguon.nutrition.Canxi (mg)"], 12);
    assert.equal(flat["Nguon.nutrition.Vitamin B12 (mcg)"], 0.4);
    assert.equal(flat["Nguon.metadata.publishedYear"], 2026);
  });

  it("builds a union of all source columns", () => {
    const csv = dynamicCsv([{ Ten: "A", "Nguon.Canxi": 12 }, { Ten: "B", "Nguon.Sat": 3 }]);
    assert.match(csv, /"Nguon.Canxi"/);
    assert.match(csv, /"Nguon.Sat"/);
  });
});
