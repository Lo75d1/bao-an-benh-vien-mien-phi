import path from "node:path";
import { readStoredEvidence } from "@/lib/evidence-storage";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const settings = await readOperationalSettings();
  if (!settings.publicMenuImages) return new Response("Ảnh món ăn đang được ẩn.", { status: 404 });

  const evidence = await prisma.mealEvidence.findFirst({
    where: { id: (await params).id, kind: "MEAL_PHOTO", dietMeal: { voidedAt: null, status: { not: "CANCELLED" } } },
    select: { storagePath: true },
  });
  if (!evidence) return new Response("Không tìm thấy ảnh.", { status: 404 });

  const contentType = IMAGE_CONTENT_TYPES[path.extname(evidence.storagePath).toLowerCase()];
  if (!contentType) return new Response("Định dạng ảnh không được công khai.", { status: 404 });
  const file = await readStoredEvidence(evidence.storagePath);
  if (!file) return new Response("Ảnh không còn trên nơi lưu.", { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": contentType,
      "content-disposition": "inline",
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
