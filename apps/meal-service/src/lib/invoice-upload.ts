export const MAX_INVOICE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_INVOICE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

const ALLOWED_INVOICE_MIME_TYPE_SET = new Set<string>(ALLOWED_INVOICE_MIME_TYPES);

export function validateInvoiceUploadFile(file: { size: number; type: string } | null | undefined, language: "vi" | "en" = "vi"): string | null {
  if (!file || file.size <= 0) return language === "en" ? "Choose an invoice image or PDF." : "Cần chọn ảnh hoặc PDF hóa đơn.";
  if (!ALLOWED_INVOICE_MIME_TYPE_SET.has(file.type)) return language === "en" ? "Only JPG, PNG, WEBP, or PDF files are accepted." : "Chỉ nhận JPG, PNG, WEBP hoặc PDF.";
  if (file.size > MAX_INVOICE_UPLOAD_BYTES) return language === "en" ? "The file exceeds 10 MB. Compress it or choose a smaller file." : "Tệp vượt quá giới hạn 10 MB. Vui lòng nén hoặc chọn tệp nhỏ hơn.";
  return null;
}
