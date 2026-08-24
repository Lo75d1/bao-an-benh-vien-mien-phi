import path from "node:path";
import { getSessionUser } from "@/lib/auth";
import { readStoredEvidence } from "@/lib/evidence-storage";
import { prisma } from "@/lib/prisma";

const contentType: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "DIETITIAN", "KITCHEN"].includes(user.role)) return new Response("Không có quyền.", { status: 401 });
  const document = await prisma.document.findUnique({ where: { id: (await params).id }, select: { storagePath: true } });
  if (!document) return new Response("Không tìm thấy hóa đơn.", { status: 404 });
  const file = await readStoredEvidence(document.storagePath);
  if (!file) return new Response("Tệp hóa đơn không còn trên nơi lưu.", { status: 404 });
  return new Response(new Uint8Array(file), { headers: { "content-type": contentType[path.extname(document.storagePath).toLowerCase()] || "application/octet-stream", "content-disposition": "inline", "cache-control": "private, no-store" } });
}
