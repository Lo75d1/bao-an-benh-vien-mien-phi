import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Paperclip } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/presentation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getSessionUser } from "@/lib/auth";
import { evidenceStorage } from "@/lib/evidence-storage";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { canManagePatientFeedback, readPatientNoteManagement } from "@/lib/patient-note";

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium" }).format(date);
}

function formatDateTime(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function PatientFeedbackManagementPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!canManagePatientFeedback(user.role)) redirect("/");
  const locale = await readLocale();
  const t = getTranslations(locale).management.patientFeedback;
  const notes = await readPatientNoteManagement();

  return <AppShell user={user} locale={locale}><main className="workspace feedback-management-page"><Separator className="page-separator" aria-hidden="true"/>
    <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} actions={<p className="scope-note">{t.adminOnly}</p>}/>
    <section className="feedback-management-list" aria-label={t.title}>
      {notes.length ? notes.map((note) => {
        const attachmentUrl = note.attachmentPath ? evidenceStorage.publicUrl(note.attachmentPath) : null;
        return <article key={note.id} className="feedback-management-card">
          <header>
            <span className={`feedback-status ${note.status.toLowerCase()}`}>{t[note.status]}</span>
            <strong>{note.department.name}</strong>
          </header>
          <p>{note.note}</p>
          <dl>
            <div><dt>{t.submittedAt}</dt><dd>{formatDateTime(note.createdAt, locale)}</dd></div>
            <div><dt>{t.mealDate}</dt><dd>{formatDate(note.mealDate, locale)}</dd></div>
            <div><dt>{t.contactName}</dt><dd>{note.contactName ?? t.noContact}</dd></div>
            <div><dt>{t.attachment}</dt><dd>{attachmentUrl ? <Link href={attachmentUrl} target="_blank"><Paperclip aria-hidden="true"/>{t.attachment}</Link> : t.noAttachment}</dd></div>
          </dl>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="secondary-button"><FileText aria-hidden="true"/>{t.viewDetail}</button>
            </DialogTrigger>
            <DialogContent className="feedback-detail-dialog">
              <DialogHeader>
                <DialogTitle>{t.dialogTitle}</DialogTitle>
                <DialogDescription>{note.department.name} · {t[note.status]}</DialogDescription>
              </DialogHeader>
              <div className="feedback-detail-body">
                <p>{note.note}</p>
                <dl>
                  <div><dt>{t.submittedAt}</dt><dd>{formatDateTime(note.createdAt, locale)}</dd></div>
                  <div><dt>{t.mealDate}</dt><dd>{formatDate(note.mealDate, locale)}</dd></div>
                  <div><dt>{t.contactName}</dt><dd>{note.contactName ?? t.noContact}</dd></div>
                  <div><dt>{t.reviewedBy}</dt><dd>{note.reviewedBy?.displayName ?? "-"}</dd></div>
                  <div><dt>{t.review}</dt><dd>{note.reviewedAt ? formatDateTime(note.reviewedAt, locale) : "-"}</dd></div>
                  <div><dt>{t.reviewNote}</dt><dd>{note.reviewNote ?? t.noReviewNote}</dd></div>
                </dl>
                {attachmentUrl ? <Link className="secondary-button" href={attachmentUrl} target="_blank"><Paperclip aria-hidden="true"/>{t.attachment}</Link> : null}
              </div>
            </DialogContent>
          </Dialog>
        </article>;
      }) : <div className="split-placeholder"><FileText aria-hidden="true"/><h2>{t.empty}</h2></div>}
    </section>
  </main></AppShell>;
}
