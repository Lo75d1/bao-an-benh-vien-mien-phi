"use client";
import { startTransition, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
const lineSchema = z.object({ dietTypeId: z.string(), name: z.string(), code: z.string(), route: z.string(), quantity: z.string().regex(/^\d+$/, "Nhập số nguyên không âm."), internalNote: z.string().max(500, "Tối đa 500 ký tự."), patientVisibleNote: z.string().max(500, "Tối đa 500 ký tự."), totalLabel: z.string().optional() });
const schema = z.object({ lines: z.array(lineSchema) }); type Fields = z.infer<typeof schema>;
export function ServingForm({ mealEventId, editable, lines, action }: { mealEventId: string; editable: boolean; lines: Fields["lines"]; action: (data: FormData) => Promise<void> }) {
 const [pending, run] = useTransition(); const { register, handleSubmit, formState: { errors } } = useForm<Fields>({ resolver: zodResolver(schema), shouldFocusError: true, defaultValues: { lines } });
 const submit = handleSubmit((values) => { const data = new FormData(); data.set("mealEventId", mealEventId); values.lines.forEach((line) => { data.append("dietTypeId", line.dietTypeId); data.set(`quantity:${line.dietTypeId}`, line.quantity); data.set(`internalNote:${line.dietTypeId}`, line.internalNote); data.set(`patientVisibleNote:${line.dietTypeId}`, line.patientVisibleNote); }); startTransition(() => run(() => action(data))); });
 return <form onSubmit={submit} noValidate><div className="serving-table-scroll"><table className="serving-table"><thead><tr><th>Chế độ ăn</th><th>Số suất</th><th>Ghi chú nội bộ</th><th>Ghi chú bệnh nhân thấy</th></tr></thead><tbody>{lines.map((line, index) => <tr key={line.dietTypeId}>
  <td><strong>{line.name}</strong><span>{line.code} · {line.route === "SONDE" ? "Sonde" : "Ăn thường"}</span></td>
  <td><label><span className="sr-only">Số suất {line.name}</span><input className="quantity-input tabular" type="number" min="0" step="1" inputMode="numeric" disabled={!editable} {...register(`lines.${index}.quantity`)} aria-invalid={!!errors.lines?.[index]?.quantity} aria-describedby={errors.lines?.[index]?.quantity ? `quantity-${index}-error` : undefined} placeholder="—"/></label>{errors.lines?.[index]?.quantity && <span id={`quantity-${index}-error`} role="alert" className="field-error">{errors.lines[index]?.quantity?.message}</span>}{!editable && <span className="serving-total">{line.totalLabel}</span>}</td>
  <td><label><span className="sr-only">Ghi chú nội bộ {line.name}</span><textarea disabled={!editable} {...register(`lines.${index}.internalNote`)} aria-invalid={!!errors.lines?.[index]?.internalNote} placeholder="Chỉ nhân viên thấy…"/></label></td>
  <td><label><span className="sr-only">Ghi chú bệnh nhân thấy {line.name}</span><textarea disabled={!editable} {...register(`lines.${index}.patientVisibleNote`)} aria-invalid={!!errors.lines?.[index]?.patientVisibleNote} placeholder="Có thể công khai qua QR…"/></label></td>
 </tr>)}</tbody></table></div><footer className="serving-actions"><p>{editable ? "Có thể sửa và lưu lại trước giờ chốt. Mỗi lần lưu đều được truy vết." : "Số suất gốc đã khóa. Mọi phát sinh được ghi thành bản bổ sung riêng."}</p><button className="primary-action" disabled={!editable || pending}>{pending ? "Đang lưu…" : "Lưu báo suất"}</button></footer></form>;
}
