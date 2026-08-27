import test from "node:test";
import assert from "node:assert/strict";
import { demoDestination } from "../src/components/demo-entry";

test("mỗi nút Demo mở thẳng màn nghiệp vụ tương ứng", () => {
  assert.equal(demoDestination("nurse", "single"), "/bao-suat");
  assert.equal(demoDestination("dietitian", "single"), "/thuc-don");
  assert.equal(demoDestination("kitchen", "single"), "/bep");
  assert.equal(demoDestination("sonde", "single"), "/bep");
  assert.equal(demoDestination("admin", "single"), "/quan-ly");
});

test("tour toàn hệ thống luôn bắt đầu từ điều dưỡng", () => {
  assert.equal(demoDestination("admin", "full"), "/bao-suat");
});
