"use client";

/* eslint-disable @next/next/no-img-element -- ảnh xem trước dùng blob URL cục bộ, chưa được tải lên */

import { Camera, CheckCircle2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { completeKitchenEventAction, reopenKitchenEventAction } from "./actions";

function ProofField({ meal }: { meal: { id: string; code: string; name: string } }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  function preview(file: File | undefined) {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }
  return <fieldset><input type="hidden" name="dietMealId" value={meal.id}/><legend><b translate="no">{meal.code}</b><span>{meal.name}</span></legend><div className="kitchen-proof-preview">{previewUrl ? <img src={previewUrl} alt={`Ảnh xem trước ${meal.code}`}/> : <span><Camera/>Chưa chọn ảnh</span>}</div><label className={previewUrl ? "has-preview" : undefined}><Camera/><span>{previewUrl ? "Chụp lại / chọn lại" : "Chụp hoặc chọn ảnh"}</span><input name={`file-${meal.id}`} type="file" accept="image/*" capture="environment" required onChange={(event) => preview(event.target.files?.[0])}/></label><input name={`note-${meal.id}`} maxLength={500} placeholder="Ghi chú cho mã này (không bắt buộc)"/></fieldset>;
}

export function KitchenCompletionDialog({ eventId, meals, prepared, canOperate }: { eventId: string; meals: Array<{ id: string; code: string; name: string }>; prepared: boolean; canOperate: boolean }) {
  if (prepared) return <form action={reopenKitchenEventAction}><input type="hidden" name="eventId" value={eventId}/><button className="kitchen-reopen" disabled={!canOperate}><RotateCcw/> Quay lại chuẩn bị</button></form>;
  return <Dialog><DialogTrigger asChild><button type="button" className="kitchen-complete" disabled={!canOperate}><CheckCircle2/> {canOperate ? "Đã chuẩn bị xong" : "Chưa tới giờ chuẩn bị"}</button></DialogTrigger><DialogContent className="kitchen-finish-dialog max-h-[92vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Hoàn tất toàn bộ bữa ăn</DialogTitle><DialogDescription>Chụp ảnh, xem lại hoặc chụp lại cho từng mã; trạng thái chỉ đổi sau khi bấm xác nhận cuối cùng.</DialogDescription></DialogHeader><form action={completeKitchenEventAction}><input type="hidden" name="eventId" value={eventId}/><div className="kitchen-proof-list">{meals.map((meal) => <ProofField key={meal.id} meal={meal}/>)}</div><div className="kitchen-finish-actions"><DialogTrigger asChild><button type="button" className="secondary-button"><RotateCcw/> Chưa xong, quay lại</button></DialogTrigger><button className="primary-action" disabled={!canOperate}><CheckCircle2/> Xác nhận tất cả đã xong</button></div></form></DialogContent></Dialog>;
}
