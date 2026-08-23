"use client";

import { Camera, CheckCircle2, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { completeKitchenEventAction, reopenKitchenEventAction } from "./actions";

export function KitchenCompletionDialog({ eventId, meals, prepared }: { eventId: string; meals: Array<{ id: string; code: string; name: string }>; prepared: boolean }) {
  if (prepared) return <form action={reopenKitchenEventAction}><input type="hidden" name="eventId" value={eventId}/><button className="kitchen-reopen"><RotateCcw/> Quay lại chuẩn bị</button></form>;
  return <Dialog><DialogTrigger asChild><button type="button" className="kitchen-complete"><CheckCircle2/> Đã chuẩn bị xong</button></DialogTrigger><DialogContent className="kitchen-finish-dialog max-h-[92vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Hoàn tất toàn bộ bữa ăn</DialogTitle><DialogDescription>Chụp và lưu ảnh mẫu cho từng mã. Chỉ cần xác nhận một lần sau khi tất cả mã đã sẵn sàng.</DialogDescription></DialogHeader><form action={completeKitchenEventAction}><input type="hidden" name="eventId" value={eventId}/><div className="kitchen-proof-list">{meals.map((meal) => <fieldset key={meal.id}><input type="hidden" name="dietMealId" value={meal.id}/><legend><b translate="no">{meal.code}</b><span>{meal.name}</span></legend><label><Camera/><span>Chọn ảnh lưu mẫu</span><input name={`file-${meal.id}`} type="file" accept="image/*" capture="environment" required/></label><input name={`note-${meal.id}`} maxLength={500} placeholder="Ghi chú cho mã này (không bắt buộc)"/></fieldset>)}</div><div className="kitchen-finish-actions"><DialogTrigger asChild><button type="button" className="secondary-button"><RotateCcw/> Chưa xong, quay lại</button></DialogTrigger><button className="primary-action"><CheckCircle2/> Xác nhận tất cả đã xong</button></div></form></DialogContent></Dialog>;
}
