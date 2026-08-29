import assert from "node:assert/strict";
import test from "node:test";
import { unseenVoiceEvents, voiceEventKeys } from "../src/lib/voice-notification";

test("chỉ trả event mới và tách NORMAL với SONDE", () => {
  const events = [{ id: "addition-1", scope: "NORMAL" as const }, { id: "addition-1", scope: "SONDE" as const }];
  assert.deepEqual(unseenVoiceEvents(["NORMAL:addition-1"], events), [events[1]]);
  assert.deepEqual(voiceEventKeys(events), ["NORMAL:addition-1", "SONDE:addition-1"]);
});

test("polling cùng ID không tạo thông báo mới", () => {
  const events = [{ id: "addition-2", scope: "NORMAL" as const }];
  assert.deepEqual(unseenVoiceEvents(voiceEventKeys(events), events), []);
});
