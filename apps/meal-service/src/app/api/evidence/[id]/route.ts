import path from "node:path";
import { getSessionUser } from "@/lib/auth";
import { readStoredEvidence } from "@/lib/evidence-storage";
import { prisma } from "@/lib/prisma";
import { readDemoSession } from "@/lib/demo-session";

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Cần đăng nhập để xem bằng chứng.", { status: 401 });

  const id = (await params).id;
  const demo = id.startsWith("demo:") ? await readDemoSession() : null;
  const demoKey = id.slice("demo:".length).replace(/:sample$/, "");
  const demoEvidence = demo?.state.evidence.find((item) => item.dietMealId === demoKey || item.mealEventId === demoKey);
  const evidence = demoEvidence ?? await prisma.mealEvidence.findUnique({
    where: { id },
    select: { storagePath: true },
  });
  if (!evidence?.storagePath) return new Response("Không tìm thấy ảnh.", { status: 404 });

  const contentType = IMAGE_CONTENT_TYPES[path.extname(evidence.storagePath).toLowerCase()];
  if (!contentType) return new Response("Định dạng ảnh không được hỗ trợ.", { status: 404 });
  const file = await readStoredEvidence(evidence.storagePath);
  if (!file) return new Response("Ảnh không còn trên nơi lưu.", { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": contentType,
      "content-disposition": "inline",
      "cache-control": "private, max-age=60",
      "x-content-type-options": "nosniff",
    },
  });
}
