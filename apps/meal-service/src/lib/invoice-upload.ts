export const MAX_INVOICE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_INVOICE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

const ALLOWED_SET = new Set<string>(ALLOWED_INVOICE_MIME_TYPES);

export function validateInvoiceUploadFile(file: { size: number; type: string } | null | undefined): string | null {
  if (!file || file.size <= 0) return "Tệp không hợp lệ.";
  if (!ALLOWED_SET.has(file.type)) return "Chỉ nhận JPG, PNG, WEBP hoặc PDF.";
  if (file.size > MAX_INVOICE_UPLOAD_BYTES) return "Tệp vượt quá giới hạn 10 MB. Vui lòng nén/chọn tệp nhỏ hơn.";
  return null;
}
