import { buildHandoffXlsx, readSetupHandoffData, safeHandoffFilename } from "@/lib/setup-handoff";
import { requireSetupHandoffAccess } from "@/lib/setup-handoff-access";

export async function GET() {
  try {
    await requireSetupHandoffAccess(); const data = await readSetupHandoffData(); const file = await buildHandoffXlsx(data);
    return new Response(new Uint8Array(file), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${safeHandoffFilename(`${data.branding.organizationName}-danh-sach-it`, "xlsx")}"`, "cache-control": "no-store" } });
  } catch { return new Response("Không có quyền tải danh sách bàn giao.", { status: 403 }); }
}
