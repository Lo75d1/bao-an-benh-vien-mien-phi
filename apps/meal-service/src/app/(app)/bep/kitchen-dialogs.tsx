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
import { acknowledgeAdditionAction, acknowledgeKitchenNoteAction, uploadEvidenceAction } from "./actions";

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

const ACK_LABEL = { RECEIVED: "Đã nhận", INSUFFICIENT: "Không đủ", SUBSTITUTE: "Cần thay thế" } as const;

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
  const pendingCount = additions.filter((item) => item.ackStatus === "PENDING").length;
  return <div className="kitchen-tools" aria-label="Công cụ bữa đang chọn">
    <Dialog>
      <DialogTrigger asChild><button type="button" className={pendingCount > 0 ? "tool-button attention" : "tool-button"}><span>Suất bổ sung</span><strong className="tabular">{pendingCount || "—"}</strong></button></DialogTrigger>
      <DialogContent className="kitchen-dialog max-h-[88vh] max-w-4xl overflow-y-auto overscroll-contain p-4">
        <DialogHeader className="pr-8"><DialogTitle>Suất bổ sung & xác nhận</DialogTitle><DialogDescription>Xử lý từng phát sinh bằng đúng một trạng thái xác nhận của bếp.</DialogDescription></DialogHeader>
        {!canOperate ? <p className="kitchen-operation-locked">Chưa tới giờ chuẩn bị. Bếp chỉ được xem thông tin.</p> : null}
        {additions.length === 0 ? <p className="dialog-empty">— · Không có suất bổ sung cho bữa này.</p> : <div className="addition-dialog-list">{additions.map((item) => {
          const noteId = `kitchen-note-${item.id}`;
          return <article className={item.kind === "URGENT_POST_SERVE" ? "urgent" : undefined} key={item.id}>
            <div className="addition-summary"><strong>+{item.quantity} suất · {item.dietType.name}</strong><span>{item.department.name} · {item.kind === "URGENT_POST_SERVE" ? "Khẩn sau phục vụ" : "Sau chốt"}</span><p>{item.reason}</p></div>
            {item.ackStatus === "PENDING" ? <form action={acknowledgeAdditionAction}><input type="hidden" name="additionId" value={item.id}/><label htmlFor={noteId}>Ghi chú bếp</label><input id={noteId} name="kitchenNote" maxLength={500} autoComplete="off" placeholder="Nhập ghi chú nếu cần…" disabled={!canOperate}/><div className="ack-actions">{(["RECEIVED", "INSUFFICIENT", "SUBSTITUTE"] as const).map((status) => <button key={status} name="ackStatus" value={status} className={status === "RECEIVED" ? "primary-action" : "secondary-button"} disabled={!canOperate}>{ACK_LABEL[status]}</button>)}</div></form> : <div className={`ack-result ack-${item.ackStatus.toLowerCase()}`}><strong>{ACK_LABEL[item.ackStatus]}</strong><span>{item.kitchenNote ?? "Không có ghi chú bếp."}</span></div>}
          </article>;
        })}</div>}
      </DialogContent>
    </Dialog>

    <Dialog>
      <DialogTrigger asChild><button type="button" className="tool-button"><span>Bằng chứng</span><strong className="tabular">{evidence.length || "—"}</strong></button></DialogTrigger>
      <DialogContent className="kitchen-dialog max-h-[88vh] max-w-4xl overflow-y-auto overscroll-contain p-4">
        <DialogHeader className="pr-8"><DialogTitle>Ảnh & bằng chứng</DialogTitle><DialogDescription>Ảnh là tệp đính kèm, không làm thay đổi trạng thái bữa ăn.</DialogDescription></DialogHeader>
        {!canOperate ? <p className="kitchen-operation-locked">Chưa tới giờ chuẩn bị. Bếp chỉ được xem bằng chứng đã có.</p> : null}
        <form className="evidence-dialog-form" action={uploadEvidenceAction} encType="multipart/form-data">
          <label>Chế độ ăn<select name="dietMealId" required>{dietMeals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Loại bằng chứng<select name="kind" required>{Object.entries(EVIDENCE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Ảnh<input name="file" type="file" accept="image/*" required/></label>
          <label>Ghi chú<input name="note" maxLength={500} autoComplete="off" placeholder="Nhập ghi chú nếu cần…"/></label>
          <button className="primary-action" disabled={!canOperate}>Đính kèm ảnh</button>
        </form>
        {evidence.length === 0 ? <p className="dialog-empty">— · Chưa có bằng chứng đã lưu.</p> : <div className="evidence-dialog-list">{evidence.map((item) => <article key={item.id}>{item.publicUrl ? <img src={item.publicUrl} alt={`${EVIDENCE_LABEL[item.kind]} · ${item.dietName}`} width="112" height="76" loading="lazy"/> : <div className="evidence-unavailable">—<span>Chưa có URL</span></div>}<div><strong>{EVIDENCE_LABEL[item.kind]}</strong><span>{item.dietName}</span><p>{item.note ?? "—"}</p></div></article>)}</div>}
      </DialogContent>
    </Dialog>

    <Dialog>
      <DialogTrigger asChild><button type="button" className="tool-button"><span>Ghi chú đã xác nhận</span><strong className="tabular">{patientNotes.length || "—"}</strong></button></DialogTrigger>
      <DialogContent className="kitchen-dialog max-h-[88vh] max-w-3xl overflow-y-auto overscroll-contain p-4">
        <DialogHeader className="pr-8"><DialogTitle>Ghi chú bệnh nhân đã xác nhận</DialogTitle><DialogDescription>Chỉ hiển thị nội dung đã qua điều dưỡng xác nhận.</DialogDescription></DialogHeader>
        {!canOperate ? <p className="kitchen-operation-locked">Chưa tới giờ chuẩn bị. Bếp có thể đọc nhưng chưa xác nhận.</p> : null}
        {patientNotes.length === 0 ? <p className="dialog-empty">— · Không có ghi chú đã xác nhận.</p> : <div className="patient-note-dialog-list">{patientNotes.map((note) => <article key={note.id}><strong>{note.note}</strong><span>{note.departmentName} · {note.mealDateLabel}</span>{note.acknowledged ? <button type="button" disabled>Đã đọc</button> : <form action={acknowledgeKitchenNoteAction}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="noteId" value={note.id}/><button disabled={!canOperate}>Xác nhận đã đọc</button></form>}</article>)}</div>}
      </DialogContent>
    </Dialog>
  </div>;
}
