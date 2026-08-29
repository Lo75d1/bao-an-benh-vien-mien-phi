import { requireBootstrapAdmin } from "@/lib/bootstrap-setup";
import { completeFirstTimeSetup } from "@/lib/first-time-setup";
import { buildHandoffXlsx, readSetupHandoffData, safeHandoffFilename } from "@/lib/setup-handoff";

export async function POST() {
  try {
    const actor = await requireBootstrapAdmin();
    const { credentials } = await completeFirstTimeSetup(actor);
    const data = await readSetupHandoffData();
    const workbook = await buildHandoffXlsx(data, credentials);
    const filename = safeHandoffFilename(`${data.branding.organizationName}-tai-khoan-ban-giao-mot-lan`, "xlsx");
    return new Response(new Uint8Array(workbook), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store", "x-setup-completed": "1" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không thể hoàn tất khởi tạo." }, { status: 400 });
  }
}
