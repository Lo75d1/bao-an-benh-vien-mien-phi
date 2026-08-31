import assert from "node:assert/strict";
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

test("invoice upload returns controlled errors for size, MIME and missing file", () => {
  assert.match(validateInvoiceUploadFile({ type: "application/pdf", size: MAX_INVOICE_UPLOAD_BYTES + 1 }) ?? "", /10 MB/);
  assert.match(validateInvoiceUploadFile({ type: "text/plain", size: 1024 }) ?? "", /JPG, PNG, WEBP/);
  assert.notEqual(validateInvoiceUploadFile(null), null);
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
