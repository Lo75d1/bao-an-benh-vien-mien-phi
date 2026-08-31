"use client";

/* eslint-disable @next/next/no-img-element -- evidence URLs may use a deployment-specific storage backend */
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { acknowledgeAdditionAction, acknowledgeKitchenNoteAction, uploadEvidenceAction } from "./actions";
import type { Language } from "@/lib/i18n";

const EVIDENCE_LABEL = {
  MEAL_PHOTO: "Ảnh bữa ăn",
  FOOD_SAMPLE: "Ảnh lưu mẫu",
  STOCK_IN: "Ảnh nhập kho",
  INVOICE: "Hóa đơn / bill",
} as const;

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
  kind: keyof typeof EVIDENCE_LABEL;
  dietName: string;
  note: string | null;
  publicUrl: string | null;
};

type PatientNote = { id: string; note: string; departmentName: string; mealDateLabel: string; acknowledged: boolean };
type PatientSubmission = PatientNote & { attachmentPath?: string | null };

const ACK_LABEL = { RECEIVED: "Đã nhận", INSUFFICIENT: "Không đủ", SUBSTITUTE: "Cần thay thế" } as const;

function KitchenDialogShell({
  title,
  description,
  children,
  maxWidthClass,
}: {
  title: string;
  description: string;
  children: ReactNode;
  maxWidthClass: string;
}) {
  return (
    <DialogContent className={`kitchen-dialog ${maxWidthClass} max-h-[calc(100dvh-1rem)] !overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)]`}>
      <div className="kitchen-dialog-shell">
        <DialogHeader className="kitchen-dialog-header">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="kitchen-dialog-scroll">{children}</div>
      </div>
    </DialogContent>
  );
}

export function KitchenDialogs({
  eventId,
  canOperate,
  additions,
  evidence,
  dietMeals,
  patientNotes,
  language = "vi",
}: {
  eventId: string;
  canOperate: boolean;
  additions: Addition[];
  evidence: Evidence[];
  dietMeals: Array<{ id: string; name: string }>;
  patientNotes: PatientSubmission[];
  language?: Language;
}) {
  const en = language === "en";
  const evidenceLabel = (kind: keyof typeof EVIDENCE_LABEL) => en ? ({ MEAL_PHOTO: "Meal photo", FOOD_SAMPLE: "Retention-sample photo", STOCK_IN: "Stock-receipt photo", INVOICE: "Invoice / bill" } as const)[kind] : EVIDENCE_LABEL[kind];
  const ackLabel = (status: keyof typeof ACK_LABEL) => en ? ({ RECEIVED: "Accepted", INSUFFICIENT: "Insufficient", SUBSTITUTE: "Substitution needed" } as const)[status] : ACK_LABEL[status];
  const pendingCount = additions.filter((item) => item.ackStatus === "PENDING").length;
  const visibleEvidence = evidence.filter((item) => item.publicUrl);

  return (
    <div className="kitchen-tools" aria-label={en ? "Selected meal tools" : "Công cụ bữa đang chọn"}>
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className={pendingCount > 0 ? "tool-button attention" : "tool-button"}>
            <span>{en ? "Additions" : "Suất bổ sung"}</span>
            <strong className="tabular">{pendingCount || "—"}</strong>
          </button>
        </DialogTrigger>
        <KitchenDialogShell
          title={en ? "Meal additions & confirmation" : "Suất bổ sung & xác nhận"}
          description={en ? "Process each addition with one clear Kitchen response." : "Xử lý từng phát sinh bằng đúng một trạng thái xác nhận của bếp."}
          maxWidthClass="max-w-4xl"
        >
          {!canOperate ? <p className="kitchen-operation-locked">{en ? "Preparation has not started. The Kitchen can only view information." : "Chưa tới giờ chuẩn bị. Bếp chỉ được xem thông tin."}</p> : null}
          {additions.length === 0 ? (
            <p className="dialog-empty">{en ? "— · No additions for this meal." : "— · Không có suất bổ sung cho bữa này."}</p>
          ) : (
            <div className="addition-dialog-list">
              {additions.map((item) => {
                const noteId = `kitchen-note-${item.id}`;
                return (
                  <article className={item.kind === "URGENT_POST_SERVE" ? "urgent" : undefined} key={item.id}>
                    <div className="addition-summary">
                      <strong>+{item.quantity} {en ? "servings" : "suất"} · {item.dietType.name}</strong>
                      <span>{item.department.name} · {item.kind === "URGENT_POST_SERVE" ? (en ? "Urgent after service" : "Khẩn sau phục vụ") : (en ? "After cutoff" : "Sau chốt")}</span>
                      <p>{item.reason}</p>
                    </div>
                    {item.ackStatus === "PENDING" ? (
                      <form action={acknowledgeAdditionAction}>
                        <input type="hidden" name="additionId" value={item.id} />
                        <label htmlFor={noteId}>{en ? "Kitchen note" : "Ghi chú bếp"}</label>
                        <input
                          id={noteId}
                          name="kitchenNote"
                          maxLength={500}
                          autoComplete="off"
                          placeholder={en ? "Add a note if needed…" : "Nhập ghi chú nếu cần…"}
                          disabled={!canOperate}
                        />
                        <div className="ack-actions">
                          {(["RECEIVED", "INSUFFICIENT", "SUBSTITUTE"] as const).map((status) => (
                            <button
                              key={status}
                              name="ackStatus"
                              value={status}
                              className={status === "RECEIVED" ? "primary-action" : "secondary-button"}
                              disabled={!canOperate}
                            >
                              {ackLabel(status)}
                            </button>
                          ))}
                        </div>
                      </form>
                    ) : (
                      <div className={`ack-result ack-${item.ackStatus.toLowerCase()}`}>
                        <strong>{ackLabel(item.ackStatus)}</strong>
                        <span>{item.kitchenNote ?? (en ? "No Kitchen note." : "Không có ghi chú bếp.")}</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </KitchenDialogShell>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="tool-button">
            <span>{en ? "Evidence" : "Bằng chứng"}</span>
            <strong className="tabular">{evidence.length || "—"}</strong>
          </button>
        </DialogTrigger>
        <KitchenDialogShell
          title={en ? "Photos & evidence" : "Ảnh & bằng chứng"}
          description={en ? "Photos are attachments and do not change meal status." : "Ảnh là tệp đính kèm, không làm thay đổi trạng thái bữa ăn."}
          maxWidthClass="max-w-4xl"
        >
          {!canOperate ? <p className="kitchen-operation-locked">{en ? "Preparation has not started. The Kitchen can only view existing evidence." : "Chưa tới giờ chuẩn bị. Bếp chỉ được xem bằng chứng đã có."}</p> : null}
          <form className="evidence-dialog-form" action={uploadEvidenceAction} encType="multipart/form-data">
            <label>
              {en ? "Diet" : "Chế độ ăn"}
              <select name="dietMealId" required>
                {dietMeals.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {en ? "Evidence type" : "Loại bằng chứng"}
              <select name="kind" required>
                {Object.entries(EVIDENCE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {en ? evidenceLabel(value as keyof typeof EVIDENCE_LABEL) : label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {en ? "Photo" : "Ảnh"}
              <input name="file" type="file" accept="image/*" required />
            </label>
            <label>
              {en ? "Note" : "Ghi chú"}
              <input name="note" maxLength={500} autoComplete="off" placeholder={en ? "Add a note if needed…" : "Nhập ghi chú nếu cần…"} />
            </label>
            <button className="primary-action" disabled={!canOperate}>
              {en ? "Attach photo" : "Đính kèm ảnh"}
            </button>
          </form>
          {visibleEvidence.length === 0 ? (
            <p className="dialog-empty">{en ? "— · No valid evidence to display." : "— · Chưa có bằng chứng hợp lệ để hiển thị."}</p>
          ) : (
            <div className="evidence-dialog-list">
              {visibleEvidence.map((item) => (
                <article key={item.id}>
                  <img src={item.publicUrl!} alt={`${evidenceLabel(item.kind)} · ${item.dietName}`} width="112" height="76" loading="lazy" />
                  <div>
                    <strong>{evidenceLabel(item.kind)}</strong>
                    <span>{item.dietName}</span>
                    <p>{item.note ?? "—"}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </KitchenDialogShell>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="tool-button">
            <span>{en ? "Approved notes" : "Ghi chú đã xác nhận"}</span>
            <strong className="tabular">{patientNotes.length || "—"}</strong>
          </button>
        </DialogTrigger>
        <KitchenDialogShell
          title={en ? "Approved patient notes" : "Ghi chú bệnh nhân đã xác nhận"}
          description={en ? "Only notes approved by nursing staff are shown." : "Chỉ hiển thị nội dung đã qua điều dưỡng xác nhận."}
          maxWidthClass="max-w-3xl"
        >
          {!canOperate ? <p className="kitchen-operation-locked">{en ? "Preparation has not started. The Kitchen can read notes but cannot acknowledge them yet." : "Chưa tới giờ chuẩn bị. Bếp có thể đọc nhưng chưa xác nhận."}</p> : null}
          {patientNotes.length === 0 ? (
            <p className="dialog-empty">{en ? "— · No approved notes." : "— · Không có ghi chú đã xác nhận."}</p>
          ) : (
            <div className="patient-note-dialog-list">
              {patientNotes.map((note) => (
                <article key={note.id}>
                  <strong>{note.note}</strong>
                  {note.attachmentPath ? <a href={`/api/patient-submission-attachments/${encodeURIComponent(note.id)}`} target="_blank" rel="noreferrer">{en ? "View attached image" : "Xem ảnh đính kèm"}</a> : null}
                  <span>{note.departmentName} · {note.mealDateLabel}</span>
                  {note.acknowledged ? (
                    <button type="button" disabled>
                      {en ? "Read" : "Đã đọc"}
                    </button>
                  ) : (
                    <form action={acknowledgeKitchenNoteAction}>
                      <input type="hidden" name="eventId" value={eventId} />
                      <input type="hidden" name="noteId" value={note.id} />
                      <button disabled={!canOperate}>{en ? "Mark as read" : "Xác nhận đã đọc"}</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </KitchenDialogShell>
      </Dialog>
    </div>
  );
}
