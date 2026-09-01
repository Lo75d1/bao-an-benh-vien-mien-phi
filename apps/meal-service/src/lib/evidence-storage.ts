import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredEvidence = { storagePath: string };
export interface EvidenceStorage { store(file: File): Promise<StoredEvidence | null>; publicUrl(storagePath: string): string | null; }

type EvidenceFileKind = "jpeg" | "png" | "webp" | "pdf";

const MIME_EXTENSIONS: Record<string, string> = { "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
const KIND_EXTENSIONS: Record<EvidenceFileKind, string> = { jpeg: ".jpg", png: ".png", webp: ".webp", pdf: ".pdf" };
const storageDirectory = () => path.resolve(process.env.EVIDENCE_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "evidence"));

function signatureKind(bytes: Uint8Array): EvidenceFileKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return "pdf";
  return null;
}

export async function validateEvidenceFile(file: File): Promise<{ buffer: Buffer; extension: string } | null> {
  if (file.size === 0 || file.size > 10 * 1024 * 1024) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = signatureKind(buffer);
  if (!kind) return null;
  const mimeExtension = MIME_EXTENSIONS[file.type];
  if (mimeExtension) return mimeExtension === KIND_EXTENSIONS[kind] ? { buffer, extension: mimeExtension } : null;
  const name = file.name.toLowerCase();
  if (kind === "jpeg" && /\.(jpe?g)$/.test(name)) return { buffer, extension: KIND_EXTENSIONS.jpeg };
  return null;
}

class LocalEvidenceStorage implements EvidenceStorage {
  async store(file: File): Promise<StoredEvidence | null> {
    const validated = await validateEvidenceFile(file);
    if (!validated) return null;
    const directory = storageDirectory();
    try {
      await mkdir(directory, { recursive: true });
      const storagePath = `${randomUUID()}${validated.extension}`;
      await writeFile(/*turbopackIgnore: true*/ path.join(directory, storagePath), validated.buffer, { flag: "wx" });
      return { storagePath };
    } catch {
      return null;
    }
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

export async function deleteStoredEvidence(storagePath: string) {
  const safeName = path.basename(storagePath);
  if (!safeName || safeName !== storagePath) return;
  try { await unlink(/*turbopackIgnore: true*/ path.join(storageDirectory(), safeName)); } catch { /* Missing demo evidence is already reset. */ }
}

export const evidenceStorage: EvidenceStorage = new LocalEvidenceStorage();

export function publicMealEvidenceUrl(id: string): string {
  return `/api/public/evidence/${encodeURIComponent(id)}`;
}

/** URL cùng origin cho bằng chứng nghiệp vụ; endpoint đích tự kiểm tra phiên nhân viên. */
export function staffMealEvidenceUrl(id: string): string {
  return `/api/evidence/${encodeURIComponent(id)}`;
}
