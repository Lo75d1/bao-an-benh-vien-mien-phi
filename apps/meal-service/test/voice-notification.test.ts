import assert from "node:assert/strict";
import test from "node:test";
import { mergeVoiceEventKeys, playAlertSound, unseenVoiceEvents, voiceEventKeys } from "../src/lib/voice-notification";

test("chỉ trả event mới và tách NORMAL với SONDE", () => {
  const events = [{ key: "NORMAL:addition-1", message: "normal" }, { key: "SONDE:addition-1", message: "sonde" }];
  assert.deepEqual(unseenVoiceEvents(["NORMAL:addition-1"], events), [events[1]]);
  assert.deepEqual(voiceEventKeys(events), ["NORMAL:addition-1", "SONDE:addition-1"]);
});

test("polling cùng ID không tạo thông báo mới", () => {
  const events = [{ key: "NORMAL:addition-2", message: "new" }];
  assert.deepEqual(unseenVoiceEvents(voiceEventKeys(events), events), []);
});

test("phase và business fact có key độc lập theo bữa", () => {
  const events = [{ key: "nurse:2026-08-29:meal-1:NORMAL:dept-1:BEFORE_CUTOFF", message: "phase" }, { key: "handoff:meal-1:NORMAL:dept-1", message: "handoff" }];
  assert.deepEqual(unseenVoiceEvents([events[0].key], events), [events[1]]);
});

test("baseline lần đầu ghi nhận record hiện có mà không tạo event mới", () => {
  const events = [{ key: "NORMAL:addition-existing", message: "existing" }];
  const baseline = mergeVoiceEventKeys([], events);
  assert.deepEqual(baseline, [events[0].key]);
  assert.deepEqual(unseenVoiceEvents(baseline, events), []);
});

test("chỉ phase được đánh dấu mới đọc ngay khi bật", () => {
  const events = [{ key: "phase:meal-1", message: "phase", announceOnEnable: true }, { key: "handoff:meal-1", message: "handoff" }];
  assert.deepEqual(events.filter((event) => event.announceOnEnable).map((event) => event.message), ["phase"]);
});

test("alert âm báo trả false khi không có window", async () => {
  const originalWindow = globalThis.window;
  (globalThis as { window?: unknown }).window = undefined;
  try {
    assert.equal(await playAlertSound(), false);
  } finally {
    if (originalWindow) (globalThis as { window?: unknown }).window = originalWindow;
    else delete (globalThis as { window?: unknown }).window;
  }
});

test("alert âm báo dùng AudioContext và không ném khi bị chặn", async () => {
  const originalWindow = globalThis.window;
  const calls: string[] = [];
  class MockAudioContext {
    currentTime = 1;
    destination = {};
    createOscillator() {
      return {
        type: "sine" as OscillatorType,
        frequency: { value: 0 },
        connect: () => calls.push("osc-connect"),
        start: () => calls.push("osc-start"),
        stop: () => calls.push("osc-stop"),
      };
    }
    createGain() {
      return {
        gain: { value: 0, linearRampToValueAtTime: () => calls.push("gain-ramp") },
        connect: () => calls.push("gain-connect"),
      };
    }
    resume() { calls.push("resume"); return Promise.resolve(); }
    close() { calls.push("close"); return Promise.resolve(); }
  }
  (globalThis as { window?: unknown }).window = { AudioContext: MockAudioContext };
  try {
    assert.equal(await playAlertSound(), true);
    assert.ok(calls.includes("resume"));
    assert.ok(calls.includes("osc-start"));
    assert.ok(calls.includes("osc-stop"));
  } finally {
    if (originalWindow) (globalThis as { window?: unknown }).window = originalWindow;
    else delete (globalThis as { window?: unknown }).window;
  }
});
