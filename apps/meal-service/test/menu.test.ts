import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteMenuTemplate } from "../src/lib/menu-template";
import { createMenuSnapshot, evaluateMenu, type MenuItemInput } from "../src/lib/menu-logic";

const complete = { energyKcal: 100, proteinG: 10, lipidG: 5, glucidG: 20, sodiumMg: 50, potassiumMg: 60, waterG: 70 };
const item: MenuItemInput = { foodId: "food-1", itemName: "Cơm", grams: 100, wastePercent: 2, nutrients: complete };
test("đánh giá trả đạt/vượt/thiếu và không đoán khi thiếu ngưỡng", () => { const result = evaluateMenu([item], { energyKcalMin: 90, energyKcalMax: 110, proteinGMin: 11, sodiumMgMax: 40 }); assert.equal(result.criteria.find((x) => x.key === "energyKcal")?.status, "OK"); assert.equal(result.criteria.find((x) => x.key === "proteinG")?.status, "LOW"); assert.equal(result.criteria.find((x) => x.key === "sodiumMg")?.status, "HIGH"); const potassium = result.criteria.find((x) => x.key === "potassiumMg"); assert.equal(potassium?.status, "MISSING"); assert.equal(potassium?.target, "—"); });
test("thiếu dữ liệu dinh dưỡng giữ actual là null", () => { const result = evaluateMenu([{ ...item, nutrients: { ...complete, sodiumMg: null } }], { sodiumMgMax: 100 }); const sodium = result.criteria.find((x) => x.key === "sodiumMg"); assert.equal(sodium?.status, "MISSING"); assert.equal(sodium?.actual, null); });
test("snapshot là bản sao bất biến với thay đổi dữ liệu đầu vào sau đó", () => { const source = [{ ...item, nutrients: { ...complete } }]; const snapshot = createMenuSnapshot(source); source[0].grams = 250; source[0].itemName = "Cơm đã sửa"; assert.deepEqual(snapshot.items[0], { foodId: "food-1", itemName: "Cơm", grams: 100, wastePercent: 2 }); });
test("chỉ xóa mẫu chưa từng được dùng", () => { assert.equal(canDeleteMenuTemplate(0), true); assert.equal(canDeleteMenuTemplate(1), false); });
