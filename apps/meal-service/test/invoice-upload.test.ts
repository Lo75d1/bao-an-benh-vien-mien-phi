import assert from "node:assert/strict";
import test from "node:test";
import { MAX_INVOICE_UPLOAD_BYTES, validateInvoiceUploadFile } from "../src/lib/invoice-upload";

test("hoa don chap nhan jpg png webp pdf toi da 10MB", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) {
    assert.equal(validateInvoiceUploadFile({ type, size: MAX_INVOICE_UPLOAD_BYTES }), null);
  }
});

test("hoa don bao loi ro khi qua dung luong hoac sai dinh dang", () => {
  assert.match(validateInvoiceUploadFile({ type: "image/jpeg", size: MAX_INVOICE_UPLOAD_BYTES + 1 }) ?? "", /10 MB/);
  assert.match(validateInvoiceUploadFile({ type: "text/plain", size: 100 }) ?? "", /JPG, PNG, WEBP/);
  assert.match(validateInvoiceUploadFile({ type: "image/png", size: 0 }) ?? "", /không hợp lệ/);
});
