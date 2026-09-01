import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { readAuditLogs } from "@/lib/reports";
import { AuditTable } from "./audit-table";
const json = (value: unknown) => value == null ? "—" : JSON.stringify(value, null, 2);
export default async function AuditPage() {
 const user = await getSessionUser(); if (!user || user.role !== "ADMIN") redirect("/");
 const logs = await readAuditLogs(); const en = user.language === "en";
 return <AppShell user={user}><main className="workspace audit-page admin-workspace"><Separator className="page-separator" aria-hidden="true"/>
  <PageHeader eyebrow={en ? "Admin" : "Quản trị"} title={en ? "Audit log" : "Nhật ký thao tác"} description={en ? "Track who performed each action, when, why, and the before-and-after data." : "Theo dõi người thực hiện, thời điểm, lý do và dữ liệu trước–sau."} actions={<p className="scope-note">{en ? "Latest 100 changes · hospital-wide" : "100 thay đổi gần nhất · toàn viện"}</p>}/>
  <section className="audit-panel" aria-labelledby="audit-heading"><div className="audit-head"><strong id="audit-heading">{en ? "Who · did what · when" : "Ai · làm gì · lúc nào"}</strong><span>{en ? "Before and after data is available in each row" : "Trước và sau nằm trong từng dòng chi tiết"}</span></div>
   <AuditTable language={user.language} data={logs.map((log) => ({ id: log.id, createdAt: log.createdAt.toISOString(), actorName: log.actorName || "—", action: log.action || "—", entityType: log.entityType || "—", entityId: log.entityId || "—", reason: log.reason || "—", before: json(log.beforeJson), after: json(log.afterJson) }))}/>
  </section>
 </main></AppShell>;
}
