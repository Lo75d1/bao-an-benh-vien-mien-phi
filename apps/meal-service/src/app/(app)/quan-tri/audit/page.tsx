import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { readAuditLogs } from "@/lib/reports";
import { AuditTable } from "./audit-table";

function json(value: unknown) { return value == null ? "-" : JSON.stringify(value, null, 2); }

export default async function AuditPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  const t = getTranslations(await readLocale()).management.auditLog;
  const logs = await readAuditLogs();
  return <AppShell user={user}><main className="workspace audit-page admin-workspace"><Separator className="page-separator" aria-hidden="true"/>
    <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} actions={<p className="scope-note">{t.scopeNote}</p>}/>
    <section className="audit-panel" aria-labelledby="audit-heading"><div className="audit-head"><strong id="audit-heading">{t.heading}</strong><span>{t.headingHelp}</span></div>
      <AuditTable data={logs.map((log) => ({ id: log.id, createdAt: log.createdAt.toISOString(), actorName: log.actorName || "-", action: log.action || "-", entityType: log.entityType || "-", entityId: log.entityId || "-", reason: log.reason || "-", before: json(log.beforeJson), after: json(log.afterJson) }))} />
    </section>
  </main></AppShell>;
}
