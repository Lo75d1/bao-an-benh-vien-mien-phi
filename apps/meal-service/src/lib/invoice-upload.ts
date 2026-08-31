export const MAX_INVOICE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_INVOICE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

const ALLOWED_INVOICE_MIME_TYPE_SET = new Set<string>(ALLOWED_INVOICE_MIME_TYPES);

export function validateInvoiceUploadFile(file: { size: number; type: string } | null | undefined): string | null {
  if (!file || file.size <= 0) return "C?n ch?n ?nh ho?c PDF h?a ??n.";
  if (!ALLOWED_INVOICE_MIME_TYPE_SET.has(file.type)) return "Ch? nh?n JPG, PNG, WEBP ho?c PDF.";
  if (file.size > MAX_INVOICE_UPLOAD_BYTES) return "T?p v??t qu? gi?i h?n 10 MB. Vui l?ng n?n ho?c ch?n t?p nh? h?n.";
  return null;
}
