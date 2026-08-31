import path from "node:path";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readSubmissionAttachment } from "@/lib/submission-attachment-storage";

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Cần đăng nhập để xem tệp đính kèm.", { status: 401 });
  const { id } = await params;
  const row = await prisma.patientNote.findUnique({ where: { id }, select: { attachmentPath: true } });
  if (!row?.attachmentPath) return new Response("Không tìm thấy tệp.", { status: 404 });
  const contentType = IMAGE_CONTENT_TYPES[path.extname(row.attachmentPath).toLowerCase()];
  if (!contentType) return new Response("Định dạng không được hỗ trợ.", { status: 404 });
  const file = await readSubmissionAttachment(row.attachmentPath);
  if (!file) return new Response("Tệp không còn trên hệ thống.", { status: 404 });
  return new Response(new Uint8Array(file), { headers: { "content-type": contentType, "content-disposition": "inline", "cache-control": "private, max-age=60", "x-content-type-options": "nosniff" } });
}
