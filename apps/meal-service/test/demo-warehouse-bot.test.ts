import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_WAREHOUSE_BILL_SAMPLES,
  demoWarehouseAppliedTotals,
  demoWarehouseBillIndex,
  demoWarehouseBotEvents,
  demoWarehouseStockBalances,
  normalizeWarehouseBotText,
} from "../src/lib/demo-warehouse-bot";
import { createInventoryTransaction } from "../src/lib/warehouse";

const foods = [
  { id: "food-pork", name: "Thịt heo nạc", nameNormalized: normalizeWarehouseBotText("Thịt heo nạc"), aliases: [{ alias: "Thịt heo nạc vai", aliasNormalized: normalizeWarehouseBotText("Thịt heo nạc vai") }] },
  { id: "food-rice", name: "Gạo tẻ", nameNormalized: normalizeWarehouseBotText("Gạo tẻ"), aliases: [{ alias: "Gạo thơm ST25", aliasNormalized: normalizeWarehouseBotText("Gạo thơm ST25") }] },
];

test("same session date and slot maps to the same bill", () => {
  const input = { demoSessionId: "demo-1", date: "2026-09-01", slot: "morning" as const };
  assert.equal(demoWarehouseBillIndex(input), demoWarehouseBillIndex(input));
});

test("two bill slots are produced for a demo day", () => {
  const events = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T08:00:00+07:00") });
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((event) => event.slot), ["morning", "afternoon"]);
});

test("same bill is not selected twice on the same date when avoidable", () => {
  const morning = demoWarehouseBillIndex({ demoSessionId: "demo-1", date: "2026-09-01", slot: "morning" });
  const afternoon = demoWarehouseBillIndex({ demoSessionId: "demo-1", date: "2026-09-01", slot: "afternoon" });
  assert.notEqual(morning, afternoon);
});

test("different demo dates vary deterministically", () => {
  const day1 = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T16:00:00+07:00") }).map((event) => event.sample.id);
  const day2 = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-02", now: new Date("2026-09-02T16:00:00+07:00") }).map((event) => event.sample.id);
  assert.notDeepEqual(day1, day2);
  assert.deepEqual(day2, demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-02", now: new Date("2026-09-02T16:00:00+07:00") }).map((event) => event.sample.id));
});

test("before scheduled time is not yet applied", () => {
  const [morning] = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T09:00:00+07:00") });
  assert.equal(morning.status, "WAITING");
  assert.equal(morning.applied, false);
  assert.equal(morning.stockReceipt, null);
});

test("after processing time is applied", () => {
  const [morning] = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T09:40:00+07:00") });
  assert.equal(morning.status, "APPLIED");
  assert.equal(morning.applied, true);
  assert.equal(morning.stockReceipt?.type, "IN");
});

test("refresh idempotency does not duplicate stock quantity", () => {
  const events = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T16:00:00+07:00") });
  const refreshed = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T16:00:00+07:00") });
  assert.deepEqual(events, refreshed);
  assert.deepEqual(demoWarehouseAppliedTotals([...events, ...refreshed]), demoWarehouseAppliedTotals(events));
  assert.deepEqual(demoWarehouseStockBalances([...events, ...refreshed]), demoWarehouseStockBalances(events));
});

test("applied bot invoices produce visible synthetic stock balances", () => {
  const waiting = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T09:00:00+07:00"), foods });
  const applied = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T16:00:00+07:00"), foods });
  assert.deepEqual(demoWarehouseStockBalances(waiting), []);
  const balances = demoWarehouseStockBalances(applied);
  assert.ok(balances.length > 0);
  assert.ok(balances.every((item) => item.quantity > 0 && item.value > 0));
});

test("demoNow advancement changes status", () => {
  const waiting = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T09:00:00+07:00") })[0];
  const reading = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T09:21:00+07:00") })[0];
  const applied = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T09:40:00+07:00") })[0];
  assert.deepEqual([waiting.status, reading.status, applied.status], ["WAITING", "READING", "APPLIED"]);
});

test("non-demo receives no Warehouse Bot output", () => {
  assert.deepEqual(demoWarehouseBotEvents({ demoSessionId: null, date: "2026-09-01", now: new Date("2026-09-01T16:00:00+07:00") }), []);
});

test("normal production warehouse action remains guarded by validation path", async () => {
  await assert.rejects(
    () => createInventoryTransaction({ warehouseId: "", type: "IN", occurredAt: new Date("2026-09-01T09:00:00+07:00"), lines: [] }, { id: "user-1", displayName: "User", role: "KITCHEN" }),
    /ít nhất|least/i,
  );
});

test("item mapping is deterministic through exact alias or predefined mapping", () => {
  const events = demoWarehouseBotEvents({ demoSessionId: "demo-4", date: "2026-09-04", now: new Date("2026-09-04T16:00:00+07:00"), foods });
  const mapped = events.flatMap((event) => event.lines).filter((line) => line.matchedFoodId);
  assert.ok(mapped.length > 0);
  assert.deepEqual(mapped, demoWarehouseBotEvents({ demoSessionId: "demo-4", date: "2026-09-04", now: new Date("2026-09-04T16:00:00+07:00"), foods }).flatMap((event) => event.lines).filter((line) => line.matchedFoodId));
});

test("unmatched items are preserved safely", () => {
  const event = demoWarehouseBotEvents({ demoSessionId: "demo-1", date: "2026-09-01", now: new Date("2026-09-01T16:00:00+07:00"), foods: [] })[0];
  assert.ok(event.lines.some((line) => line.matchSource === "UNMATCHED"));
  assert.ok(event.lines.every((line) => line.originalLabel.length > 0));
});

test("DemoSession isolation is encoded into stable synthetic ids", () => {
  const event = demoWarehouseBotEvents({ demoSessionId: "demo-abc", date: "2026-09-01", now: new Date("2026-09-01T16:00:00+07:00") })[0];
  assert.match(event.id, /^demo-warehouse-bot:/);
  assert.equal(DEMO_WAREHOUSE_BILL_SAMPLES.length, 7);
});
