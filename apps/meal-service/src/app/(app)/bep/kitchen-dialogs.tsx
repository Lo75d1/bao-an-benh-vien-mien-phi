"use client";

/* eslint-disable @next/next/no-img-element -- evidence URLs may use a deployment-specific storage backend */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";
import { acknowledgeAdditionAction, acknowledgeKitchenNoteAction, uploadEvidenceAction } from "./actions";

type Addition = {
  id: string;
  quantity: number;
  reason: string;
  kind: "SUPPLEMENT" | "URGENT_POST_SERVE";
  ackStatus: "PENDING" | "RECEIVED" | "INSUFFICIENT" | "SUBSTITUTE";
  kitchenNote: string | null;
  department: { name: string };
  dietType: { name: string };
};

type Evidence = {
  id: string;
  kind: "MEAL_PHOTO" | "FOOD_SAMPLE" | "STOCK_IN" | "INVOICE";
  dietName: string;
  note: string | null;
  publicUrl: string | null;
};

type PatientNote = { id: string; note: string; departmentName: string; mealDateLabel: string; acknowledged: boolean; attachmentPath?: string | null };

export function KitchenDialogs({
  eventId,
  canOperate,
  additions,
  evidence,
  dietMeals,
  patientNotes,
}: {
  eventId: string;
  canOperate: boolean;
  additions: Addition[];
  evidence: Evidence[];
  dietMeals: Array<{ id: string; name: string }>;
  patientNotes: PatientNote[];
}) {
  const t = getTranslations(readClientLocale()).management.kitchenDialogs;
  const evidenceLabel = {
    MEAL_PHOTO: t.mealPhoto,
    FOOD_SAMPLE: t.foodSample,
    STOCK_IN: t.stockInPhoto,
    INVOICE: t.invoicePhoto,
  } as const;
  const uploadEvidenceLabel = {
    MEAL_PHOTO: evidenceLabel.MEAL_PHOTO,
    STOCK_IN: evidenceLabel.STOCK_IN,
    INVOICE: evidenceLabel.INVOICE,
  } as const;
  const ackLabel = { RECEIVED: t.received, INSUFFICIENT: t.insufficient, SUBSTITUTE: t.substitute, PENDING: t.pending } as const;
  const pendingCount = additions.filter((item) => item.ackStatus === "PENDING").length;

  return <div className="kitchen-tools" aria-label={t.toolsLabel}>
    <Dialog>
      <DialogTrigger asChild><button type="button" className={pendingCount > 0 ? "tool-button attention" : "tool-button"}><span>{t.additionsTrigger}</span><strong className="tabular">{pendingCount || "-"}</strong></button></DialogTrigger>
      <DialogContent className="kitchen-dialog max-h-[88vh] max-w-4xl overflow-y-auto overscroll-contain p-4">
        <DialogHeader className="pr-8"><DialogTitle>{t.additionsTitle}</DialogTitle><DialogDescription>{t.additionsDescription}</DialogDescription></DialogHeader>
        {!canOperate ? <p className="kitchen-operation-locked">{t.lockedInfo}</p> : null}
        {additions.length === 0 ? <p className="dialog-empty">{t.noAdditions}</p> : <div className="addition-dialog-list">{additions.map((item) => {
          const noteId = `kitchen-note-${item.id}`;
          return <article className={item.kind === "URGENT_POST_SERVE" ? "urgent" : undefined} key={item.id}>
            <div className="addition-summary"><strong>{t.additionSummary.replace("{quantity}", String(item.quantity)).replace("{diet}", item.dietType.name)}</strong><span>{t.additionMeta.replace("{department}", item.department.name).replace("{kind}", item.kind === "URGENT_POST_SERVE" ? t.urgentAfterServe : t.afterCutoff)}</span><p>{item.reason}</p></div>
            {item.ackStatus === "PENDING" ? <form action={acknowledgeAdditionAction}><input type="hidden" name="additionId" value={item.id}/><label htmlFor={noteId}>{t.kitchenNote}</label><input id={noteId} name="kitchenNote" maxLength={500} autoComplete="off" placeholder={t.notePlaceholder} disabled={!canOperate}/><div className="ack-actions">{(["RECEIVED", "INSUFFICIENT", "SUBSTITUTE"] as const).map((status) => <button key={status} name="ackStatus" value={status} className={status === "RECEIVED" ? "primary-action" : "secondary-button"} disabled={!canOperate}>{ackLabel[status]}</button>)}</div></form> : <div className={`ack-result ack-${item.ackStatus.toLowerCase()}`}><strong>{ackLabel[item.ackStatus]}</strong><span>{item.kitchenNote ?? t.noKitchenNote}</span></div>}
          </article>;
        })}</div>}
      </DialogContent>
    </Dialog>

    <Dialog>
      <DialogTrigger asChild><button type="button" className="tool-button"><span>{t.evidenceTrigger}</span><strong className="tabular">{evidence.length || "-"}</strong></button></DialogTrigger>
      <DialogContent className="kitchen-dialog max-h-[88vh] max-w-4xl overflow-y-auto overscroll-contain p-4">
        <DialogHeader className="pr-8"><DialogTitle>{t.evidenceTitle}</DialogTitle><DialogDescription>{t.evidenceDescription}</DialogDescription></DialogHeader>
        {!canOperate ? <p className="kitchen-operation-locked">{t.evidenceLockedInfo}</p> : null}
        <form className="evidence-dialog-form" action={uploadEvidenceAction} encType="multipart/form-data">
          <label>{t.dietLabel}<select name="dietMealId" required>{dietMeals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>{t.evidenceKindLabel}<select name="kind" required>{Object.entries(uploadEvidenceLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>{t.photoLabel}<input name="file" type="file" accept="image/*" required/></label>
          <label>{t.noteLabel}<input name="note" maxLength={500} autoComplete="off" placeholder={t.notePlaceholder}/></label>
          <button className="primary-action" disabled={!canOperate}>{t.attachPhoto}</button>
        </form>
        {evidence.filter((item) => item.publicUrl).length === 0 ? <p className="dialog-empty">{t.noEvidence}</p> : <div className="evidence-dialog-list">{evidence.filter((item) => item.publicUrl).map((item) => <article key={item.id}><img src={item.publicUrl!} alt={t.evidenceAlt.replace("{kind}", evidenceLabel[item.kind]).replace("{diet}", item.dietName)} width="112" height="76" loading="lazy"/><div><strong>{evidenceLabel[item.kind]}</strong><span>{item.dietName}</span><p>{item.note ?? "-"}</p></div></article>)}</div>}
      </DialogContent>
    </Dialog>

    <Dialog>
      <DialogTrigger asChild><button type="button" className="tool-button"><span>{t.approvedNotesTrigger}</span><strong className="tabular">{patientNotes.length || "-"}</strong></button></DialogTrigger>
      <DialogContent className="kitchen-dialog max-h-[88vh] max-w-3xl overflow-y-auto overscroll-contain p-4">
        <DialogHeader className="pr-8"><DialogTitle>{t.approvedNotesTitle}</DialogTitle><DialogDescription>{t.approvedNotesDescription}</DialogDescription></DialogHeader>
        {!canOperate ? <p className="kitchen-operation-locked">{t.approvedNotesLockedInfo}</p> : null}
        {patientNotes.length === 0 ? <p className="dialog-empty">{t.noApprovedNotes}</p> : <div className="patient-note-dialog-list">{patientNotes.map((note) => <article key={note.id}><strong>{note.note}</strong><span>{t.noteMeta.replace("{department}", note.departmentName).replace("{date}", note.mealDateLabel)}</span>{note.attachmentPath ? <a href={`/api/patient-submission-attachments/${encodeURIComponent(note.id)}`} target="_blank" rel="noreferrer">{t.viewAttachment}</a> : null}{note.acknowledged ? <button type="button" disabled>{t.read}</button> : <form action={acknowledgeKitchenNoteAction}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="noteId" value={note.id}/><button disabled={!canOperate}>{t.confirmRead}</button></form>}</article>)}</div>}
      </DialogContent>
    </Dialog>
  </div>;
}
