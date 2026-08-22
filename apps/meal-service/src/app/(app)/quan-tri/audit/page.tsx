import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { readAuditLogs } from "@/lib/reports";
import { AuditTable } from "./audit-table";
import "../quan-tri.css";

function json(value: unknown) { return value == null ? "—" : JSON.stringify(value, null, 2); }

export default async function AuditPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  const logs = await readAuditLogs();
  return <AppShell user={user}><main className="workspace audit-page admin-workspace">
    <PageHeader eyebrow="Quản trị" title="Nhật ký thao tác" description="Theo dõi người thực hiện, thời điểm, lý do và dữ liệu trước–sau." actions={<p className="scope-note">100 thay đổi gần nhất · toàn viện</p>}/>
    <section className="audit-panel" aria-labelledby="audit-heading"><div className="audit-head"><strong id="audit-heading">Ai · làm gì · lúc nào</strong><span>Trước và sau nằm trong từng dòng chi tiết</span></div>
      <AuditTable data={logs.map((log) => ({ id: log.id, createdAt: log.createdAt.toISOString(), actorName: log.actorName || "—", action: log.action || "—", entityType: log.entityType || "—", entityId: log.entityId || "—", reason: log.reason || "—", before: json(log.beforeJson), after: json(log.afterJson) }))} />
    </section>
  </main></AppShell>;
}
