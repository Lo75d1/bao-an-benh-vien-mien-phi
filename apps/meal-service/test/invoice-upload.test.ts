import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { MAX_INVOICE_UPLOAD_BYTES, validateInvoiceUploadFile } from "../src/lib/invoice-upload";
import { evidenceStorage } from "../src/lib/evidence-storage";
import { saveWarehouseInvoice } from "../src/lib/warehouse";

test("invoice upload accepts JPG PNG WEBP PDF up to 10 MB", () => {
  assert.equal(validateInvoiceUploadFile({ type: "image/jpeg", size: MAX_INVOICE_UPLOAD_BYTES }), null);
  assert.equal(validateInvoiceUploadFile({ type: "image/png", size: 1024 }), null);
  assert.equal(validateInvoiceUploadFile({ type: "image/webp", size: 1024 }), null);
  assert.equal(validateInvoiceUploadFile({ type: "application/pdf", size: 1024 }), null);
});

test("invoice upload accepts Android camera-style JPEG metadata", () => {
  assert.equal(validateInvoiceUploadFile({ type: "", name: "IMG_20260901_101010.jpg", size: 1024 }), null);
  assert.equal(validateInvoiceUploadFile({ type: "image/jpg", name: "camera.jpg", size: 1024 }), null);
});

test("invoice upload returns controlled errors for size, MIME and missing file", () => {
  assert.match(validateInvoiceUploadFile({ type: "application/pdf", size: MAX_INVOICE_UPLOAD_BYTES + 1 }) ?? "", /10 MB/);
  assert.match(validateInvoiceUploadFile({ type: "text/plain", size: 1024 }) ?? "", /JPG, PNG, WEBP/);
  assert.match(validateInvoiceUploadFile({ type: "", name: "camera.txt", size: 1024 }) ?? "", /JPG, PNG, WEBP/);
  assert.notEqual(validateInvoiceUploadFile(null), null);
});

test("Android camera JPEG storage is accepted and keeps the upload controlled", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "meal-invoice-camera-"));
  const previous = process.env.EVIDENCE_STORAGE_DIR;
  process.env.EVIDENCE_STORAGE_DIR = directory;
  try {
    const stored = await evidenceStorage.store(new File([new Uint8Array([
      0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08,
      0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07,
      0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d,
      0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f,
      0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c,
      0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c,
      0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30,
      0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d,
      0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff,
      0xd9
    ])], "IMG_20260901_101010.jpg", { type: "" }));
    assert.ok(stored);
  } finally {
    if (previous === undefined) delete process.env.EVIDENCE_STORAGE_DIR; else process.env.EVIDENCE_STORAGE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test("warehouse invoice storage failure stays controlled and does not create records", async () => {
  const originalStore = evidenceStorage.store;
  evidenceStorage.store = async () => null;
  try {
    const result = await saveWarehouseInvoice({
      warehouseId: "warehouse-1",
      occurredAt: new Date("2026-08-31T00:00:00.000Z"),
      file: new File(["x"], "hoa-don.pdf", { type: "application/pdf" }),
      note: null,
    }, { id: "user-1", displayName: "Admin", role: "ADMIN" });
    assert.deepEqual(result, { stored: false });
  } finally {
    evidenceStorage.store = originalStore;
  }
});

test("invoice upload storage failure stays controlled for camera metadata", async () => {
  const originalStore = evidenceStorage.store;
  evidenceStorage.store = async () => null;
  try {
    const result = await saveWarehouseInvoice({
      warehouseId: "warehouse-1",
      occurredAt: new Date("2026-08-31T00:00:00.000Z"),
      file: new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "IMG_20260901_101010.jpg", { type: "" }),
      note: null,
    }, { id: "user-1", displayName: "Admin", role: "ADMIN" });
    assert.deepEqual(result, { stored: false });
  } finally {
    evidenceStorage.store = originalStore;
  }
});
