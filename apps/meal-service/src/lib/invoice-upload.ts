export const MAX_INVOICE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_INVOICE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const ALLOWED_INVOICE_ALIAS_MIME_TYPES = new Set(["image/jpg", "image/pjpeg"]);
const ALLOWED_INVOICE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);

const ALLOWED_INVOICE_MIME_TYPE_SET = new Set<string>(ALLOWED_INVOICE_MIME_TYPES);

function hasSafeInvoiceExtension(name?: string): boolean {
  if (!name) return false;
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
  return ALLOWED_INVOICE_EXTENSIONS.has(extension);
}

export function validateInvoiceUploadFile(file: { size: number; type: string; name?: string } | null | undefined, language: "vi" | "en" = "vi"): string | null {
  if (!file || file.size <= 0) return language === "en" ? "Choose an invoice image or PDF." : "Cần chọn ảnh hoặc PDF hóa đơn.";
  if (file.type && !ALLOWED_INVOICE_MIME_TYPE_SET.has(file.type) && !ALLOWED_INVOICE_ALIAS_MIME_TYPES.has(file.type)) return language === "en" ? "Only JPG, PNG, WEBP, or PDF files are accepted." : "Chỉ nhận JPG, PNG, WEBP hoặc PDF.";
  if (!file.type && !hasSafeInvoiceExtension(file.name)) return language === "en" ? "Only JPG, PNG, WEBP, or PDF files are accepted." : "Chỉ nhận JPG, PNG, WEBP hoặc PDF.";
  if (file.size > MAX_INVOICE_UPLOAD_BYTES) return language === "en" ? "The file exceeds 10 MB. Compress it or choose a smaller file." : "Tệp vượt quá giới hạn 10 MB. Vui lòng nén hoặc chọn tệp nhỏ hơn.";
  return null;
}

export async function detectInvoiceUploadMime(file: File): Promise<string | null> {
  if (ALLOWED_INVOICE_MIME_TYPE_SET.has(file.type)) return file.type;
  if (file.size <= 0) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return "application/pdf";
  return null;
}
