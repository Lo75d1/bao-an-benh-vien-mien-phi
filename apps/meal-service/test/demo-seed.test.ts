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

test("fact bếp demo do kịch bản quyết định, không do giờ trong ngày", () => {
  assert.equal(demoMealStatus(2, 3), "SERVED");
  assert.equal(demoMealStatus(2, 3, true), "PREPARED");
  assert.equal(demoMealStatus(3, 3), "PLANNED");
});
