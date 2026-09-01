import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evidenceStorage, readStoredEvidence } from "../src/lib/evidence-storage";

test("luu va doc lai anh hoa don trong thu muc cau hinh", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "meal-invoice-"));
  const previous = process.env.EVIDENCE_STORAGE_DIR;
  process.env.EVIDENCE_STORAGE_DIR = directory;
  try {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const stored = await evidenceStorage.store(new File([png], "hoa-don.png", { type: "image/png" }));
    assert.ok(stored);
    assert.deepEqual(await readStoredEvidence(stored.storagePath), Buffer.from(png));
    assert.equal(await readStoredEvidence("../khong-hop-le.png"), null);
  } finally {
    if (previous === undefined) delete process.env.EVIDENCE_STORAGE_DIR; else process.env.EVIDENCE_STORAGE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test("tu choi tep khong phai anh hoac PDF theo chu ky byte", async () => {
  assert.equal(await evidenceStorage.store(new File(["x"], "x.txt", { type: "text/plain" })), null);
  assert.equal(await evidenceStorage.store(new File(["not an image"], "fake.png", { type: "image/png" })), null);
});

test("nhan JPEG that tu camera Android du MIME trong", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "meal-invoice-android-"));
  const previous = process.env.EVIDENCE_STORAGE_DIR;
  process.env.EVIDENCE_STORAGE_DIR = directory;
  try {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00]);
    const stored = await evidenceStorage.store(new File([jpeg], "camera.jpg", { type: "" }));
    assert.ok(stored);
    assert.match(stored.storagePath, /\.jpg$/);
  } finally {
    if (previous === undefined) delete process.env.EVIDENCE_STORAGE_DIR; else process.env.EVIDENCE_STORAGE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
