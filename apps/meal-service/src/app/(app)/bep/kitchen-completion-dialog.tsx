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

export function KitchenCompletionDialog({ eventId, meals, prepared, canOperate, foodRetention24hRequired }: { eventId: string; meals: Array<{ id: string; code: string; name: string }>; prepared: boolean; canOperate: boolean; foodRetention24hRequired: boolean }) {
  if (prepared) return <form action={reopenKitchenEventAction}><input type="hidden" name="eventId" value={eventId}/><button className="kitchen-reopen" disabled={!canOperate}><RotateCcw/> Quay lại chuẩn bị</button></form>;
  return <Dialog><DialogTrigger asChild><button type="button" className="kitchen-complete" disabled={!canOperate}><CheckCircle2/> {canOperate ? "Đã chuẩn bị xong" : "Chưa tới giờ chuẩn bị"}</button></DialogTrigger><DialogContent className="kitchen-finish-dialog max-h-[92vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Hoàn tất toàn bộ bữa ăn</DialogTitle><DialogDescription>Chụp ảnh món thực tế cho từng mã. Nếu bệnh viện bật quy định lưu mẫu, bước chung 24 giờ nằm cuối biểu mẫu.</DialogDescription></DialogHeader><form action={completeKitchenEventAction}><input type="hidden" name="eventId" value={eventId}/><div className="kitchen-proof-list">{meals.map((meal) => <ProofField key={meal.id} meal={meal}/>)}</div>{foodRetention24hRequired ? <fieldset className="kitchen-retention-proof"><legend><b>Mẫu lưu thực phẩm 24 giờ</b><span>Áp dụng chung cho toàn bữa</span></legend><p>Sau khi chụp đủ ảnh từng mã, chụp một ảnh xác nhận phần mẫu đã được lưu theo quy định của bệnh viện.</p><label><Camera/><span>Chụp ảnh mẫu lưu chung</span><input name="retentionFile" type="file" accept="image/*" capture="environment" required/></label><input name="retentionNote" maxLength={500} placeholder="Vị trí lưu hoặc ghi chú (không bắt buộc)"/></fieldset> : null}<div className="kitchen-finish-actions"><DialogTrigger asChild><button type="button" className="secondary-button"><RotateCcw/> Chưa xong, quay lại</button></DialogTrigger><button className="primary-action" disabled={!canOperate}><CheckCircle2/> Xác nhận tất cả đã xong</button></div></form></DialogContent></Dialog>;
}
