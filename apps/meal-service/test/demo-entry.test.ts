import test from "node:test";
import assert from "node:assert/strict";
import { demoDestination } from "../src/components/demo-entry";

test("mỗi nút Demo mở thẳng màn nghiệp vụ tương ứng", () => {
  assert.equal(demoDestination("nurse"), "/bao-suat");
  assert.equal(demoDestination("dietitian"), "/thuc-don");
  assert.equal(demoDestination("kitchen"), "/bep");
  assert.equal(demoDestination("sonde"), "/bep");
  assert.equal(demoDestination("admin"), "/quan-ly");
});
