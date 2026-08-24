import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evidenceStorage, readStoredEvidence } from "../src/lib/evidence-storage";

test("lưu và đọc lại ảnh hóa đơn trong thư mục cấu hình", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "meal-invoice-"));
  const previous = process.env.EVIDENCE_STORAGE_DIR;
  process.env.EVIDENCE_STORAGE_DIR = directory;
  try {
    const stored = await evidenceStorage.store(new File([new Uint8Array([1, 2, 3])], "hoa-don.png", { type: "image/png" }));
    assert.ok(stored);
    assert.deepEqual(await readStoredEvidence(stored.storagePath), Buffer.from([1, 2, 3]));
    assert.equal(await readStoredEvidence("../khong-hop-le.png"), null);
  } finally {
    if (previous === undefined) delete process.env.EVIDENCE_STORAGE_DIR; else process.env.EVIDENCE_STORAGE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test("từ chối định dạng không phải ảnh hoặc PDF", async () => {
  assert.equal(await evidenceStorage.store(new File(["x"], "x.txt", { type: "text/plain" })), null);
});
