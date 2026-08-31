import test from "node:test";
import assert from "node:assert/strict";
import { mergeSoundEventKeys, soundEventKeys, unseenSoundEvents } from "../src/lib/sound-notification";

const events = [
  { key: "report:1", message: "Có khoa gửi báo suất." },
  { key: "handoff:1", message: "Bếp đã bàn giao." },
];

test("soundEventKeys returns stable event ids", () => {
  assert.deepEqual(soundEventKeys(events), ["report:1", "handoff:1"]);
});

test("unseenSoundEvents filters stored ids", () => {
  assert.deepEqual(unseenSoundEvents(["report:1"], events), [events[1]]);
});

test("mergeSoundEventKeys deduplicates ids", () => {
  const baseline = mergeSoundEventKeys([], events);
  assert.deepEqual(mergeSoundEventKeys(baseline, [events[0]]), ["report:1", "handoff:1"]);
});
