import assert from "node:assert/strict";
import test from "node:test";
import {
  RNI_ITEM_DELAY_MAX_MS,
  RNI_ITEM_DELAY_MIN_MS,
  RNI_RETRY_DELAYS_MS,
  RNI_SYNC_PAGE_SIZE,
  retryDelayMs,
  rniItemDelayMs,
} from "../src/lib/official-data-sync";

test("RNI nghỉ ngẫu nhiên trong khoảng an toàn giữa từng món", () => {
  assert.equal(RNI_SYNC_PAGE_SIZE, 1);
  assert.equal(rniItemDelayMs(0), RNI_ITEM_DELAY_MIN_MS);
  assert.equal(rniItemDelayMs(1), RNI_ITEM_DELAY_MAX_MS);
  assert.equal(rniItemDelayMs(-1), RNI_ITEM_DELAY_MIN_MS);
  assert.equal(rniItemDelayMs(2), RNI_ITEM_DELAY_MAX_MS);
});

test("RNI giãn nhịp tăng dần khi nguồn giới hạn hoặc lỗi", () => {
  assert.deepEqual(RNI_RETRY_DELAYS_MS, [5_000, 15_000, 30_000, 60_000]);
  assert.equal(retryDelayMs(5_000, 20_000), 20_000);
  assert.equal(retryDelayMs(15_000, null), 15_000);
});
