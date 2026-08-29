import { buildHandoffDocx, readSetupHandoffData, safeHandoffFilename } from "@/lib/setup-handoff";
import { requireSetupHandoffAccess } from "@/lib/setup-handoff-access";

export async function GET(request: Request) {
  try {
    await requireSetupHandoffAccess(); const data = await readSetupHandoffData(); const url = new URL(request.url); const file = await buildHandoffDocx(data, url.origin);
    return new Response(new Uint8Array(file), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content-disposition": `attachment; filename="${safeHandoffFilename(`${data.branding.organizationName}-ho-so-ban-giao`, "docx")}"`, "cache-control": "no-store" } });
  } catch { return new Response("Không có quyền tải hồ sơ bàn giao.", { status: 403 }); }
}
