import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storageDirectory = () => path.resolve(process.env.SUBMISSION_ATTACHMENT_STORAGE_DIR?.trim() || path.join(process.cwd(), ".data", "submissions"));

export function isAllowedSubmissionAttachmentMime(type: string) {
  return type in EXTENSIONS;
}

export async function storeSubmissionAttachment(file: File): Promise<{ storagePath: string; mimeType: string; size: number } | null> {
  const extension = EXTENSIONS[file.type];
  if (!extension) return null;
  const directory = storageDirectory();
  await mkdir(directory, { recursive: true });
  const storagePath = `${randomUUID()}${extension}`;
  await writeFile(path.join(directory, storagePath), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  return { storagePath, mimeType: file.type, size: file.size };
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
    // missing files are tolerated in demo/cleanup flows
  }
}

