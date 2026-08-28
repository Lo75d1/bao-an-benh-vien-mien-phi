import assert from "node:assert/strict";
import test from "node:test";
import { pageRequestClock, parsePageDemoTime } from "../src/lib/page-demo-time";

const realNow = new Date("2026-08-28T07:13:00.000Z");

test("page demo time chỉ nhận mốc từ giờ thực trở đi", () => {
  assert.equal(parsePageDemoTime("2026-08-28T06:00:00.000Z", realNow), null);
  assert.equal(parsePageDemoTime("khong-hop-le", realNow), null);
  assert.equal(parsePageDemoTime("2026-08-28T10:00:00.000Z", realNow)?.toISOString(), "2026-08-28T10:00:00.000Z");
});

test("không truyền pageDemoTime thì workspace luôn dùng giờ thực", () => {
  const clock = pageRequestClock(null, realNow, true);
  assert.equal(clock.now.toISOString(), realNow.toISOString());
  assert.equal(clock.simulated, false);
});

test("pageDemoTime chỉ tạo effectiveTime, không mang trạng thái nghiệp vụ", () => {
  const clock = pageRequestClock("2026-08-28T10:00:00.000Z", realNow, true);
  assert.deepEqual(clock, { now: new Date("2026-08-28T10:00:00.000Z"), enabled: true, simulated: true });
  assert.equal("status" in clock, false);
  assert.equal("prepared" in clock, false);
  assert.equal("served" in clock, false);
});

test("production bỏ qua mọi pageDemoTime", () => {
  const clock = pageRequestClock("2026-08-28T10:00:00.000Z", realNow, false);
  assert.deepEqual(clock, { now: realNow, enabled: false, simulated: false });
});
