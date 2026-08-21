import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { readAuditLogs } from "@/lib/reports";

const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" });
function json(value: unknown) { return value == null ? "—" : JSON.stringify(value, null, 2); }

export default async function AuditPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  const logs = await readAuditLogs();
  return <AppShell user={user}><main className="workspace audit-page">
    <PageHeader eyebrow="Quản trị" title="Nhật ký thao tác" description="Theo dõi người thực hiện, thời điểm, lý do và dữ liệu trước–sau." actions={<p className="scope-note">100 thay đổi gần nhất · toàn viện</p>}/>
    <section className="audit-panel" aria-labelledby="audit-heading"><div className="audit-head"><strong id="audit-heading">Ai · làm gì · lúc nào</strong><span>Trước và sau nằm trong từng dòng chi tiết</span></div>
      {logs.length === 0 ? <div className="panel-empty">—<span>Chưa có nhật ký thao tác.</span></div> : <div className="audit-list">{logs.map((log) => <details key={log.id} className="audit-entry"><summary><span className="audit-time tabular">{dateTime.format(log.createdAt)}</span><strong>{log.actorName || "—"}</strong><span className="audit-action">{log.action || "—"}</span><span>{log.entityType || "—"}</span><span className="audit-reason">{log.reason || "—"}</span></summary><div className="audit-detail"><div><span>Đối tượng</span><code>{log.entityType}:{log.entityId}</code></div><section><h2>Trước</h2><pre>{json(log.beforeJson)}</pre></section><section><h2>Sau</h2><pre>{json(log.afterJson)}</pre></section></div></details>)}</div>}
    </section>
  </main></AppShell>;
}
