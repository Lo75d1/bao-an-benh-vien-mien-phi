"use client";

/* eslint-disable @next/next/no-img-element -- blob URL cục bộ và URL bằng chứng do hệ thống cấp */
import { Camera, CheckCircle2, ImageIcon, RotateCcw, Upload } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { INITIAL_ACTION_RESULT } from "@/lib/action-result";
import { optimizeFormImages } from "@/lib/client-image-upload";
import { completeKitchenEventAction, reopenKitchenEventAction, saveFoodRetentionAction } from "./actions";
import type { Language } from "@/lib/i18n";

type Evidence = { publicUrl: string; note: string | null; uploadedAt: string } | null;

function useOptimizedImageSubmit(language: Language) {
  const resubmitting = useRef(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (resubmitting.current) {
      resubmitting.current = false;
      return;
    }
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const hasNewImage = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="file"]'))
      .some((input) => Boolean(input.files?.[0]));
    if (!hasNewImage) return;

    event.preventDefault();
    setOptimizing(true);
    setOptimizationError(null);
    try {
      await optimizeFormImages(form);
      resubmitting.current = true;
      form.requestSubmit(submitter ?? undefined);
    } catch (error) {
      setOptimizationError(error instanceof Error ? error.message : language === "en" ? "Unable to optimize the selected image." : "Không thể tối ưu ảnh đã chọn.");
    } finally {
      setOptimizing(false);
    }
  }

  return { onSubmit, optimizing, optimizationError };
}

function ImagePicker({ baseName, existing, label, language }: { baseName: string; existing: Evidence; label: string; language: Language }) {
  const en = language === "en";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  function preview(file: File | undefined, other: React.RefObject<HTMLInputElement | null>) {
    if (other.current) other.current.value = "";
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }
  const shown = previewUrl ?? existing?.publicUrl ?? null;
  return <>
    <div className="kitchen-proof-preview">{shown ? <img src={shown} alt={`${en ? "Photo" : "Ảnh"} ${label}`}/> : <span><ImageIcon/>{en ? "No photo" : "Chưa có ảnh"}</span>}</div>
    <div className="kitchen-image-actions">
      <label><Camera/> {en ? "Take photo" : "Chụp ảnh"}<input ref={camera} name={`camera-${baseName}`} type="file" accept="image/*" capture="environment" onChange={(event) => preview(event.target.files?.[0], library)}/></label>
      <label><Upload/> {en ? "Choose from library" : "Chọn từ thư viện"}<input ref={library} name={`library-${baseName}`} type="file" accept="image/*" onChange={(event) => preview(event.target.files?.[0], camera)}/></label>
    </div>
    {existing && !previewUrl ? <small className="kitchen-saved-proof"><CheckCircle2/> {en ? "Saved photo · choose another to replace it" : "Ảnh đã lưu · có thể chọn ảnh khác để thay"}</small> : null}
  </>;
}

function ProofField({ meal, language }: { meal: { id: string; code: string; name: string; evidence: Evidence }; language: Language }) {
  return <fieldset>
    <input type="hidden" name="dietMealId" value={meal.id}/>
    <legend><b translate="no">{meal.code}</b><span>{meal.name}</span></legend>
    <ImagePicker baseName={meal.id} existing={meal.evidence} label={meal.code} language={language}/>
    <input name={`note-${meal.id}`} maxLength={500} defaultValue={meal.evidence?.note ?? ""} placeholder={language === "en" ? "Meal photo note (optional)" : "Ghi chú ảnh món (không bắt buộc)"}/>
  </fieldset>;
}

export function FoodRetentionControl({ eventId, evidence, canOperate, language = "vi" }: { eventId: string; evidence: Evidence; canOperate: boolean; language?: Language }) {
  const en = language === "en";
  const [result, action, pending] = useActionState(saveFoodRetentionAction, INITIAL_ACTION_RESULT);
  const imageSubmit = useOptimizedImageSubmit(language);
  const busy = pending || imageSubmit.optimizing;
  return <form action={action} onSubmit={imageSubmit.onSubmit} className="kitchen-retention-card">
    <input type="hidden" name="eventId" value={eventId}/>
    <div><b>{en ? "24-hour food-retention sample" : "Mẫu lưu thực phẩm 24 giờ"}</b><small>{en ? "Evidence for the whole meal, independent of delivery receipt" : "Chứng cứ chung cho toàn bữa, độc lập với giao nhận"}</small></div>
    <ImagePicker baseName="retention" existing={evidence} label={en ? "24-hour retention sample" : "mẫu lưu 24 giờ"} language={language}/>
    <input name="retentionNote" maxLength={500} defaultValue={evidence?.note ?? ""} placeholder={en ? "Storage location or note (optional)" : "Vị trí lưu hoặc ghi chú (không bắt buộc)"}/>
    {imageSubmit.optimizationError ? <p role="alert" className="action-feedback action-feedback-error">{imageSubmit.optimizationError}</p> : null}
    <ActionFeedback result={result}/>
    <ActionButton type="submit" disabled={!canOperate} pending={busy} pendingLabel={imageSubmit.optimizing ? (en ? "Optimizing image…" : "Đang tối ưu ảnh…") : (en ? "Saving sample…" : "Đang lưu mẫu…")}><CheckCircle2/> {evidence ? (en ? "Update sample" : "Cập nhật mẫu lưu") : (en ? "Confirm sample stored" : "Xác nhận đã lưu mẫu")}</ActionButton>
  </form>;
}

export function KitchenCompletionDialog({ eventId, meals, prepared, canOperate, language = "vi" }: { eventId: string; meals: Array<{ id: string; code: string; name: string; evidence: Evidence }>; prepared: boolean; canOperate: boolean; language?: Language }) {
  const en = language === "en";
  const [result, formAction, pending] = useActionState(completeKitchenEventAction, INITIAL_ACTION_RESULT);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const imageSubmit = useOptimizedImageSubmit(language);
  const busy = pending || imageSubmit.optimizing;
  useEffect(() => {
    if (result.status !== "success") return;
    queueMicrotask(() => {
      setOpen(false);
      router.refresh();
    });
  }, [result.status, router]);
  return <div className="kitchen-completion-area">
    {prepared ? <div className="kitchen-completed-action"><span><CheckCircle2/> {en ? "Confirmed ready for delivery" : "Đã xác nhận sẵn sàng giao"}</span><form action={reopenKitchenEventAction}><input type="hidden" name="eventId" value={eventId}/><button className="kitchen-reopen" disabled={!canOperate}><RotateCcw/> {en ? "Resume preparation" : "Quay lại chuẩn bị"}</button></form></div> : null}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button type="button" className="kitchen-complete" disabled={!canOperate || busy}><Camera/> {prepared ? (en ? "View / replace meal photos" : "Xem / thay ảnh món") : canOperate ? (en ? "Meal photos & ready confirmation" : "Ảnh món & xác nhận sẵn sàng") : (en ? "Preparation has not started" : "Chưa tới giờ chuẩn bị")}</button></DialogTrigger>
      <DialogContent className="kitchen-finish-dialog max-h-[calc(100dvh-1rem)] max-w-4xl overflow-y-auto sm:max-h-[92dvh]">
        <DialogHeader><DialogTitle>{en ? "Meal photos by diet code" : "Ảnh món theo mã chế độ ăn"}</DialogTitle><DialogDescription>{en ? "Take or choose a photo for each code. Saved photos are reused unless replaced. The 24-hour sample is recorded separately in the Kitchen checklist." : "Chụp hoặc chọn ảnh cho từng mã. Ảnh đã lưu được dùng lại; chọn ảnh mới nếu cần thay. Mẫu lưu 24 giờ được ghi riêng trong checklist Bếp."}</DialogDescription></DialogHeader>
        <form action={formAction} onSubmit={imageSubmit.onSubmit}>
          <input type="hidden" name="eventId" value={eventId}/>
          <div className="kitchen-finish-scroll">
            <div className="kitchen-proof-list">{meals.map((meal) => <ProofField key={meal.id} meal={meal} language={language}/>)}</div>
            {imageSubmit.optimizationError ? <p role="alert" className="action-feedback action-feedback-error">{imageSubmit.optimizationError}</p> : null}
            <ActionFeedback result={result}/>
          </div>
          <div className="kitchen-finish-actions">
            <button type="button" className="secondary-button" disabled={busy} onClick={() => setOpen(false)}><RotateCcw/> {en ? "Back" : "Quay lại"}</button>
            <ActionButton type="submit" className="primary-action" disabled={!canOperate} pending={busy} pendingLabel={imageSubmit.optimizing ? (en ? "Optimizing images…" : "Đang tối ưu ảnh…") : (en ? "Saving images…" : "Đang lưu ảnh…")}><CheckCircle2/> {prepared ? (en ? "Save photo changes" : "Lưu ảnh thay đổi") : (en ? "Confirm ready for delivery" : "Xác nhận sẵn sàng giao")}</ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
