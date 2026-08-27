import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredEvidence = { storagePath: string };
export interface EvidenceStorage { store(file: File): Promise<StoredEvidence | null>; publicUrl(storagePath: string): string | null; }

const EXTENSIONS: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
const storageDirectory = () => path.resolve(process.env.EVIDENCE_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "evidence"));

class LocalEvidenceStorage implements EvidenceStorage {
  async store(file: File): Promise<StoredEvidence | null> {
    const extension = EXTENSIONS[file.type];
    if (!extension) return null;
    const directory = storageDirectory();
    await mkdir(directory, { recursive: true });
    const storagePath = `${randomUUID()}${extension}`;
    await writeFile(/*turbopackIgnore: true*/ path.join(directory, storagePath), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
    return { storagePath };
  }
  publicUrl(storagePath: string): string | null {
    const baseUrl = process.env.EVIDENCE_PUBLIC_BASE_URL?.trim();
    if (!baseUrl || !storagePath) return null;
    return `${baseUrl.replace(/\/$/, "")}/${storagePath.replace(/^\//, "")}`;
  }
}

// M4 defines the storage boundary without assuming a local or cloud backend.
export async function readStoredEvidence(storagePath: string) {
  const safeName = path.basename(storagePath);
  if (!safeName || safeName !== storagePath) return null;
  try { return await readFile(/*turbopackIgnore: true*/ path.join(storageDirectory(), safeName)); } catch { return null; }
}

export const evidenceStorage: EvidenceStorage = new LocalEvidenceStorage();

/** URL nội bộ cùng origin, chỉ endpoint công khai mới quyết định tệp nào được phép đọc. */
export function publicMealEvidenceUrl(id: string): string {
  return `/api/public/evidence/${encodeURIComponent(id)}`;
}
