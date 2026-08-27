import assert from "node:assert/strict";
import test from "node:test";
import { assertDemoDatasetEnabled, demoMealStatus, dietTypesForRoute } from "../scripts/seed-demo";

test("chặn ghi dữ liệu Demo nếu database không có cờ kép", () => {
  assert.throws(() => assertDemoDatasetEnabled({ DEMO_MODE: "1" }), /DEMO_DATASET/);
  assert.doesNotThrow(() => assertDemoDatasetEnabled({ DEMO_MODE: "1", DEMO_DATASET: "1" }));
});

test("bot chỉ ghép mã chế độ với bữa cùng đường nuôi", () => {
  const dietTypes = [
    { code: "COM_THUONG", feedingRoute: "NORMAL" as const },
    { code: "SONDE_TC", feedingRoute: "SONDE" as const },
  ];
  assert.deepEqual(dietTypesForRoute("NORMAL", dietTypes).map((item) => item.code), ["COM_THUONG"]);
  assert.deepEqual(dietTypesForRoute("SONDE", dietTypes).map((item) => item.code), ["SONDE_TC"]);
});

test("trạng thái cữ Sonde dùng giờ riêng của chính cữ", () => {
  const date = new Date("2026-08-26T00:00:00.000Z");
  const now = new Date("2026-08-26T07:30:00.000Z"); // 14:30 Việt Nam
  assert.equal(demoMealStatus(date, "14:00", "17:00", now), "PREPARING");
  assert.equal(demoMealStatus(date, "17:00", "18:00", now), "PLANNED");
});
