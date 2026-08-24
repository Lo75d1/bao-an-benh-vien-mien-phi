import { getSessionUser } from "@/lib/auth";
import type { ImportColumnMap, ImportField } from "@/lib/menu-excel-import";

const fields: ImportField[] = ["dietCode", "mealName", "dishName", "foodName", "grams", "energyKcal", "proteinG", "lipidG", "glucidG", "sodiumMg", "potassiumMg", "waterG"];

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !["DIETITIAN", "ADMIN"].includes(user.role)) return Response.json({ error: "Không có quyền." }, { status: 401 });
  const body = await request.json().catch(() => null) as { headers?: unknown; samples?: unknown; externalProcessingConsent?: unknown } | null;
  if (body?.externalProcessingConsent !== true) return Response.json({ error: "Cần xác nhận trước khi gửi tên cột ra dịch vụ AI." }, { status: 400 });
  if (!Array.isArray(body.headers) || !body.headers.length || body.headers.length > 60 || !body.headers.every((value) => typeof value === "string" && value.length <= 120)) return Response.json({ error: "Danh sách cột không hợp lệ." }, { status: 400 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "Máy chủ chưa cấu hình AI. Bạn vẫn có thể ghép cột bằng tay." }, { status: 503 });
  const samples = Array.isArray(body.samples) ? body.samples.slice(0, 3) : [];
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = `Ghép cột Excel thực đơn bệnh viện vào các trường chuẩn. Chỉ trả JSON object, khóa là trường chuẩn, giá trị là chỉ số cột bắt đầu từ 0. Không đoán trường không có. Trường chuẩn: ${fields.join(", ")}\nCột: ${JSON.stringify(body.headers)}\nDòng mẫu: ${JSON.stringify(samples)}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!response?.ok) return Response.json({ error: "AI chưa phân tích được tệp. Bạn vẫn có thể ghép cột bằng tay." }, { status: 502 });
  const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  let candidate: Record<string, unknown> = {};
  try { candidate = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { /* Giữ ánh xạ rỗng để người dùng tự chọn. */ }
  const mapping: ImportColumnMap = {};
  for (const field of fields) { const index = candidate[field]; if (Number.isInteger(index) && Number(index) >= 0 && Number(index) < body.headers.length) mapping[field] = Number(index); }
  return Response.json({ mapping });
}
