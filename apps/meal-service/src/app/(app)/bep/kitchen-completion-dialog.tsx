"use client";

/* eslint-disable @next/next/no-img-element -- local blob URLs and system evidence URLs */
import { Camera, CheckCircle2, ImageIcon, RotateCcw, Upload } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { INITIAL_ACTION_RESULT } from "@/lib/action-result";
import { optimizeFormImages } from "@/lib/client-image-upload";
import { getTranslations, readClientLocale } from "@/lib/locale";
import { completeKitchenEventAction, reopenKitchenEventAction, saveFoodRetentionAction } from "./actions";

type Evidence = { publicUrl: string; note: string | null; uploadedAt: string } | null;

function useOptimizedImageSubmit() {
  const t = getTranslations(readClientLocale()).management.kitchenCompletion;
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
      setOptimizationError(error instanceof Error ? error.message : t.optimizeImageFailed);
    } finally {
      setOptimizing(false);
    }
  }

  return { onSubmit, optimizing, optimizationError };
}

function ImagePicker({ baseName, existing, label }: { baseName: string; existing: Evidence; label: string }) {
  const t = getTranslations(readClientLocale()).management.kitchenCompletion;
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
    <div className="kitchen-proof-preview">{shown ? <img src={shown} alt={t.imageAlt.replace("{label}", label)}/> : <span><ImageIcon/>{t.noPhoto}</span>}</div>
    <div className="kitchen-image-actions">
      <label><Camera/> {t.takePhoto}<input ref={camera} name={`camera-${baseName}`} type="file" accept="image/*" capture="environment" onChange={(event) => preview(event.target.files?.[0], library)}/></label>
      <label><Upload/> {t.chooseFromLibrary}<input ref={library} name={`library-${baseName}`} type="file" accept="image/*" onChange={(event) => preview(event.target.files?.[0], camera)}/></label>
    </div>
    {existing && !previewUrl ? <small className="kitchen-saved-proof"><CheckCircle2/> {t.savedPhotoHint}</small> : null}
  </>;
}

function ProofField({ meal }: { meal: { id: string; code: string; name: string; evidence: Evidence } }) {
  const t = getTranslations(readClientLocale()).management.kitchenCompletion;
  return <fieldset>
    <input type="hidden" name="dietMealId" value={meal.id}/>
    <legend><b translate="no">{meal.code}</b><span>{meal.name}</span></legend>
    <ImagePicker baseName={meal.id} existing={meal.evidence} label={meal.code}/>
    <input name={`note-${meal.id}`} maxLength={500} defaultValue={meal.evidence?.note ?? ""} placeholder={t.mealPhotoNotePlaceholder}/>
  </fieldset>;
}

export function FoodRetentionControl({ eventId, evidence, canOperate }: { eventId: string; evidence: Evidence; canOperate: boolean }) {
  const t = getTranslations(readClientLocale()).management.kitchenCompletion;
  const [result, action, pending] = useActionState(saveFoodRetentionAction, INITIAL_ACTION_RESULT);
  const imageSubmit = useOptimizedImageSubmit();
  const busy = pending || imageSubmit.optimizing;
  return <form action={action} onSubmit={imageSubmit.onSubmit} className="kitchen-retention-card">
    <input type="hidden" name="eventId" value={eventId}/>
    <div><b>{t.retentionTitle}</b><small>{t.retentionDescription}</small></div>
    <ImagePicker baseName="retention" existing={evidence} label={t.retentionLabel}/>
    <input name="retentionNote" maxLength={500} defaultValue={evidence?.note ?? ""} placeholder={t.retentionNotePlaceholder}/>
    {imageSubmit.optimizationError ? <p role="alert" className="action-feedback action-feedback-error">{imageSubmit.optimizationError}</p> : null}
    <ActionFeedback result={result}/>
    <ActionButton type="submit" disabled={!canOperate} pending={busy} pendingLabel={imageSubmit.optimizing ? t.optimizingImage : t.savingRetention}><CheckCircle2/> {evidence ? t.updateRetention : t.confirmRetention}</ActionButton>
  </form>;
}

export function KitchenCompletionDialog({ eventId, meals, prepared, canOperate }: { eventId: string; meals: Array<{ id: string; code: string; name: string; evidence: Evidence }>; prepared: boolean; canOperate: boolean }) {
  const t = getTranslations(readClientLocale()).management.kitchenCompletion;
  const [result, formAction, pending] = useActionState(completeKitchenEventAction, INITIAL_ACTION_RESULT);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const imageSubmit = useOptimizedImageSubmit();
  const busy = pending || imageSubmit.optimizing;
  useEffect(() => {
    if (result.status !== "success") return;
    queueMicrotask(() => {
      setOpen(false);
      router.refresh();
    });
  }, [result.status, router]);
  return <div className="kitchen-completion-area">
    {prepared ? <div className="kitchen-completed-action"><span><CheckCircle2/> {t.preparedStatus}</span><form action={reopenKitchenEventAction}><input type="hidden" name="eventId" value={eventId}/><button className="kitchen-reopen" disabled={!canOperate}><RotateCcw/> {t.reopenPreparation}</button></form></div> : null}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button type="button" className="kitchen-complete" disabled={!canOperate || busy}><Camera/> {prepared ? t.viewChangePhotos : canOperate ? t.photoAndConfirm : t.notPreparationTime}</button></DialogTrigger>
      <DialogContent className="kitchen-finish-dialog max-h-[calc(100dvh-1rem)] max-w-4xl overflow-y-auto sm:max-h-[92dvh]">
        <DialogHeader><DialogTitle>{t.dialogTitle}</DialogTitle><DialogDescription>{t.dialogDescription}</DialogDescription></DialogHeader>
        <form action={formAction} onSubmit={imageSubmit.onSubmit}>
          <input type="hidden" name="eventId" value={eventId}/>
          <div className="kitchen-finish-scroll">
            <div className="kitchen-proof-list">{meals.map((meal) => <ProofField key={meal.id} meal={meal}/>)}</div>
            {imageSubmit.optimizationError ? <p role="alert" className="action-feedback action-feedback-error">{imageSubmit.optimizationError}</p> : null}
            <ActionFeedback result={result}/>
          </div>
          <div className="kitchen-finish-actions">
            <button type="button" className="secondary-button" disabled={busy} onClick={() => setOpen(false)}><RotateCcw/> {t.back}</button>
            <ActionButton type="submit" className="primary-action" disabled={!canOperate} pending={busy} pendingLabel={imageSubmit.optimizing ? t.optimizingImage : t.savingPhotos}><CheckCircle2/> {prepared ? t.saveChangedPhotos : t.confirmReady}</ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
