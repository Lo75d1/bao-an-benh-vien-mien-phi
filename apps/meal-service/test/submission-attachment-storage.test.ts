import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deleteSubmissionAttachment, MAX_SUBMISSION_ATTACHMENT_SIZE, readSubmissionAttachment, storeSubmissionAttachment, validateSubmissionAttachment } from "../src/lib/submission-attachment-storage";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

test("submission attachment is optional for empty files", async () => {
  const result = await validateSubmissionAttachment(new File([], "empty.jpg", { type: "image/jpeg" }));
  assert.equal(result, null);
});

test("valid JPEG PNG and WEBP attachments are accepted by bytes", async () => {
  const cases = [
    { bytes: jpeg, name: "photo.jpg", type: "image/jpeg", expected: "image/jpeg" },
    { bytes: png, name: "photo.png", type: "image/png", expected: "image/png" },
    { bytes: webp, name: "photo.webp", type: "image/webp", expected: "image/webp" },
    { bytes: jpeg, name: "camera.jpg", type: "", expected: "image/jpeg" },
  ];
  for (const item of cases) {
    const result = await validateSubmissionAttachment(new File([item.bytes], item.name, { type: item.type }));
    assert.equal(result?.mimeType, item.expected);
    assert.equal(result?.size, item.bytes.byteLength);
  }
});

test("fake images and mismatched MIME are rejected", async () => {
  await assert.rejects(() => validateSubmissionAttachment(new File([new Uint8Array([1, 2, 3])], "fake.jpg", { type: "image/jpeg" })), /PATIENT_ATTACHMENT_INVALID/);
  await assert.rejects(() => validateSubmissionAttachment(new File([png], "wrong.jpg", { type: "image/jpeg" })), /PATIENT_ATTACHMENT_INVALID/);
});

test("attachments over 10 MB are rejected", async () => {
  const oversized = new Uint8Array(MAX_SUBMISSION_ATTACHMENT_SIZE + 1);
  oversized.set(jpeg);
  await assert.rejects(() => validateSubmissionAttachment(new File([oversized], "large.jpg", { type: "image/jpeg" })), /PATIENT_ATTACHMENT_TOO_LARGE/);
});

test("stored attachments use safe basenames and can be deleted", async () => {
  const previous = process.env.SUBMISSION_ATTACHMENT_STORAGE_DIR;
  const directory = await mkdtemp(path.join(os.tmpdir(), "submission-attachments-"));
  process.env.SUBMISSION_ATTACHMENT_STORAGE_DIR = directory;
  try {
    const stored = await storeSubmissionAttachment(new File([jpeg], "photo.jpg", { type: "image/jpeg" }));
    assert.ok(stored);
    assert.match(stored.storagePath, /^[a-f0-9-]+\.jpg$/);
    assert.deepEqual(await readSubmissionAttachment(stored.storagePath), Buffer.from(jpeg));
    await writeFile(path.join(directory, "outside.jpg"), Buffer.from(jpeg));
    assert.equal(await readSubmissionAttachment("../outside.jpg"), null);
    await deleteSubmissionAttachment(stored.storagePath);
    assert.equal(await readSubmissionAttachment(stored.storagePath), null);
  } finally {
    if (previous === undefined) delete process.env.SUBMISSION_ATTACHMENT_STORAGE_DIR;
    else process.env.SUBMISSION_ATTACHMENT_STORAGE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
