"use client";

/* eslint-disable @next/next/no-img-element -- blob URL cục bộ và URL bằng chứng do hệ thống cấp */
import {
  Camera,
  CheckCircle2,
  ImageIcon,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { INITIAL_ACTION_RESULT } from "@/lib/action-result";
import {
  completeKitchenEventAction,
  reopenKitchenEventAction,
  saveFoodRetentionAction,
} from "./actions";

type Evidence = {
  publicUrl: string;
  note: string | null;
  uploadedAt: string;
} | null;

function ImagePicker({
  baseName,
  existing,
  label,
}: {
  baseName: string;
  existing: Evidence;
  label: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );
  function preview(
    file: File | undefined,
    other: React.RefObject<HTMLInputElement | null>,
  ) {
    if (other.current) other.current.value = "";
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }
  const shown = previewUrl ?? existing?.publicUrl ?? null;
  return (
    <>
      <div className="kitchen-proof-preview">
        {shown ? (
          <img src={shown} alt={`Ảnh ${label}`} />
        ) : (
          <span>
            <ImageIcon />
            Chưa có ảnh
          </span>
        )}
      </div>
      <div className="kitchen-image-actions">
        <label>
          <Camera /> Chụp ảnh
          <input
            ref={camera}
            name={`camera-${baseName}`}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => preview(e.target.files?.[0], library)}
          />
        </label>
        <label>
          <Upload /> Chọn từ thư viện
          <input
            ref={library}
            name={`library-${baseName}`}
            type="file"
            accept="image/*"
            onChange={(e) => preview(e.target.files?.[0], camera)}
          />
        </label>
      </div>
      {existing && !previewUrl ? (
        <small className="kitchen-saved-proof">
          <CheckCircle2 /> Ảnh đã lưu · có thể chọn ảnh khác để thay
        </small>
      ) : null}
    </>
  );
}

function ProofField({
  meal,
}: {
  meal: { id: string; code: string; name: string; evidence: Evidence };
}) {
  return (
    <fieldset>
      <input type="hidden" name="dietMealId" value={meal.id} />
      <legend>
        <b translate="no">{meal.code}</b>
        <span>{meal.name}</span>
      </legend>
      <ImagePicker
        baseName={meal.id}
        existing={meal.evidence}
        label={meal.code}
      />
      <input
        name={`note-${meal.id}`}
        maxLength={500}
        defaultValue={meal.evidence?.note ?? ""}
        placeholder="Ghi chú ảnh món (không bắt buộc)"
      />
    </fieldset>
  );
}

export function FoodRetentionControl({
  eventId,
  evidence,
  canOperate,
}: {
  eventId: string;
  evidence: Evidence;
  canOperate: boolean;
}) {
  const [result, action, pending] = useActionState(
    saveFoodRetentionAction,
    INITIAL_ACTION_RESULT,
  );
  return (
    <form action={action} className="kitchen-retention-card">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <b>Mẫu lưu thực phẩm 24 giờ</b>
        <small>Chứng cứ chung cho toàn bữa, độc lập với giao nhận</small>
      </div>
      <ImagePicker
        baseName="retention"
        existing={evidence}
        label="mẫu lưu 24 giờ"
      />
      <input
        name="retentionNote"
        maxLength={500}
        defaultValue={evidence?.note ?? ""}
        placeholder="Vị trí lưu hoặc ghi chú (không bắt buộc)"
      />
      <ActionFeedback result={result} />
      <ActionButton
        type="submit"
        disabled={!canOperate}
        pending={pending}
        pendingLabel="Đang lưu mẫu…"
      >
        <CheckCircle2 /> {evidence ? "Cập nhật mẫu lưu" : "Xác nhận đã lưu mẫu"}
      </ActionButton>
    </form>
  );
}

export function KitchenCompletionDialog({
  eventId,
  meals,
  prepared,
  canOperate,
}: {
  eventId: string;
  meals: Array<{ id: string; code: string; name: string; evidence: Evidence }>;
  prepared: boolean;
  canOperate: boolean;
}) {
  const [result, formAction, pending] = useActionState(
    completeKitchenEventAction,
    INITIAL_ACTION_RESULT,
  );
  return (
    <div className="kitchen-completion-area">
      {prepared ? (
        <div className="kitchen-completed-action">
          <span>
            <CheckCircle2 /> Đã xác nhận sẵn sàng giao
          </span>
          <form action={reopenKitchenEventAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <button className="kitchen-reopen" disabled={!canOperate}>
              <RotateCcw /> Quay lại chuẩn bị
            </button>
          </form>
        </div>
      ) : null}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="kitchen-complete"
            disabled={!canOperate || pending}
          >
            <Camera />{" "}
            {prepared
              ? "Xem / thay ảnh món"
              : canOperate
                ? "Ảnh món & xác nhận sẵn sàng"
                : "Chưa tới giờ chuẩn bị"}
          </button>
        </DialogTrigger>
        <DialogContent className="kitchen-finish-dialog max-h-[92dvh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ảnh món theo mã chế độ ăn</DialogTitle>
            <DialogDescription>
              Chụp hoặc chọn ảnh cho từng mã. Ảnh đã lưu được dùng lại; chọn ảnh
              mới nếu cần thay. Mẫu lưu 24 giờ được ghi riêng trong checklist
              Bếp.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <div className="kitchen-proof-list">
              {meals.map((meal) => (
                <ProofField key={meal.id} meal={meal} />
              ))}
            </div>
            <ActionFeedback result={result} actionId="kitchen-ready" />
            <div className="kitchen-finish-actions">
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={pending}
                >
                  <RotateCcw /> Quay lại
                </button>
              </DialogTrigger>
              <ActionButton
                type="submit"
                className="primary-action"
                disabled={!canOperate}
                pending={pending}
                pendingLabel="Đang lưu ảnh…"
              >
                <CheckCircle2 />{" "}
                {prepared ? "Lưu ảnh thay đổi" : "Xác nhận sẵn sàng giao"}
              </ActionButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
