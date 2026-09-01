import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_SUBMISSION_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storageDirectory = () => path.resolve(process.env.SUBMISSION_ATTACHMENT_STORAGE_DIR?.trim() || path.join(process.cwd(), ".data", "submissions"));

function detectedImageType(bytes: Uint8Array): keyof typeof EXTENSIONS | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

export function isAllowedSubmissionAttachmentMime(type: string) {
  return type in EXTENSIONS;
}

export async function validateSubmissionAttachment(file: File): Promise<{ bytes: Buffer; mimeType: keyof typeof EXTENSIONS; size: number } | null> {
  if (file.size <= 0) return null;
  if (file.size > MAX_SUBMISSION_ATTACHMENT_SIZE) throw new Error("PATIENT_ATTACHMENT_TOO_LARGE");
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = detectedImageType(bytes);
  if (!mimeType) throw new Error("PATIENT_ATTACHMENT_INVALID");
  if (file.type && isAllowedSubmissionAttachmentMime(file.type) && file.type !== mimeType) throw new Error("PATIENT_ATTACHMENT_INVALID");
  return { bytes, mimeType, size: file.size };
}

export async function storeSubmissionAttachment(file: File): Promise<{ storagePath: string; mimeType: string; size: number } | null> {
  const validated = await validateSubmissionAttachment(file);
  if (!validated) return null;
  const directory = storageDirectory();
  await mkdir(directory, { recursive: true });
  const storagePath = `${randomUUID()}${EXTENSIONS[validated.mimeType]}`;
  await writeFile(path.join(directory, storagePath), validated.bytes, { flag: "wx" });
  return { storagePath, mimeType: validated.mimeType, size: validated.size };
}

export async function readSubmissionAttachment(storagePath: string) {
  const safeName = path.basename(storagePath);
  if (!safeName || safeName !== storagePath) return null;
  try {
    return await readFile(path.join(storageDirectory(), safeName));
  } catch {
    return null;
  }
}

export async function deleteSubmissionAttachment(storagePath: string) {
  const safeName = path.basename(storagePath);
  if (!safeName || safeName !== storagePath) return;
  try {
    await unlink(path.join(storageDirectory(), safeName));
  } catch {
    // Missing files are tolerated during cleanup.
  }
}
