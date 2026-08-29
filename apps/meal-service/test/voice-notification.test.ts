import assert from "node:assert/strict";
import test from "node:test";
import { mergeVoiceEventKeys, unseenVoiceEvents, voiceEventKeys } from "../src/lib/voice-notification";

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
