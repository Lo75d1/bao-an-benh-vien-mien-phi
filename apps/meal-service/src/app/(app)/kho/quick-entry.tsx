"use client";

import { startTransition, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { getTranslations, readClientLocale } from "@/lib/locale";
import { createTransactionAction } from "./actions";

type WarehouseOption = { id: string; name: string; kind: string };
type MealOption = { id: string; feedingRoute: string; label: string };

function schemaFor(t: ReturnType<typeof getTranslations>["management"]["warehouseQuickEntry"]) {
  const lineSchema = z.object({ itemName: z.string().max(200), foodId: z.string(), quantity: z.string(), unit: z.string().max(30), unitPrice: z.string() }).superRefine((line, context) => {
    const used = !!(line.itemName.trim() || line.quantity.trim() || line.unit.trim() || line.unitPrice.trim());
    if (!used) return;
    if (!line.itemName.trim()) context.addIssue({ code: "custom", path: ["itemName"], message: t.itemRequired });
    if (!line.quantity.trim() || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) context.addIssue({ code: "custom", path: ["quantity"], message: t.positiveQuantity });
    if (!line.unit.trim()) context.addIssue({ code: "custom", path: ["unit"], message: t.unitRequired });
    if (line.unitPrice.trim() && Number(line.unitPrice) < 0) context.addIssue({ code: "custom", path: ["unitPrice"], message: t.nonNegativePrice });
  });
  return z.object({ type: z.enum(["IN", "OUT", "ADJUST"]), warehouseId: z.string().min(1, t.selectWarehouse), occurredAt: z.string().min(1, t.selectTime), relatedDietMealId: z.string(), note: z.string().max(500), lines: z.array(lineSchema) }).superRefine((value, context) => {
    if (!value.lines.some((line) => line.itemName.trim() || line.quantity.trim() || line.unit.trim())) context.addIssue({ code: "custom", path: ["lines", 0, "itemName"], message: t.atLeastOneLine });
  });
}

type Fields = z.infer<ReturnType<typeof schemaFor>>;
const emptyLine = { itemName: "", foodId: "", quantity: "", unit: "", unitPrice: "" };

export function QuickEntry({ warehouses, meals, defaultOccurredAt }: { warehouses: WarehouseOption[]; meals: MealOption[]; defaultOccurredAt: string }) {
  const t = getTranslations(readClientLocale()).management.warehouseQuickEntry;
  const [pending, setPending] = useTransition();
  const { register, control, handleSubmit, formState: { errors } } = useForm<Fields>({ resolver: zodResolver(schemaFor(t)), shouldFocusError: true, defaultValues: { type: "IN", warehouseId: warehouses[0]?.id ?? "", occurredAt: defaultOccurredAt, relatedDietMealId: "", note: "", lines: [{ ...emptyLine }, { ...emptyLine }] } });
  const { fields, append } = useFieldArray({ control, name: "lines" });
  const submit = handleSubmit((_values, event) => {
    const form = event?.target;
    if (!(form instanceof HTMLFormElement)) return;
    const data = new FormData(form);
    startTransition(() => setPending(() => createTransactionAction(data)));
  });
  const warehouseKind = (kind: string) => kind === "GENERAL" ? t.generalWarehouse : kind === "KITCHEN" ? t.kitchenWarehouse : t.sondeWarehouse;
  return <form onSubmit={submit} noValidate className="warehouse-entry-form"><div className="warehouse-form-head">
    <label>{t.type}<select {...register("type")}><option value="IN">{t.in}</option><option value="OUT">{t.out}</option><option value="ADJUST">{t.adjust}</option></select></label>
    <label>{t.warehouse}<select {...register("warehouseId")} aria-invalid={!!errors.warehouseId}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouseKind(warehouse.kind)})</option>)}</select>{errors.warehouseId && <span role="alert" className="field-error">{errors.warehouseId.message}</span>}</label>
    <label>{t.time}<input type="datetime-local" {...register("occurredAt")} aria-invalid={!!errors.occurredAt}/>{errors.occurredAt && <span role="alert" className="field-error">{errors.occurredAt.message}</span>}</label>
    <label>{t.relatedMeal}<select {...register("relatedDietMealId")}><option value="">{t.noRelatedMeal}</option>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.label} - {meal.feedingRoute === "SONDE" ? t.sondeWarehouse : t.normalMeal}</option>)}</select></label>
  </div><div className="warehouse-lines"><div className="warehouse-line warehouse-line-head"><span>{t.foodNameHeader}</span><span>{t.foodCodeHeader}</span><span>{t.quantityHeader}</span><span>{t.unitHeader}</span><span>{t.unitPriceHeader}</span></div>{fields.map((field, index) => <div className="warehouse-line" key={field.id}>
    <label><span className="sr-only">{t.itemNameSr.replace("{index}", String(index + 1))}</span><input {...register(`lines.${index}.itemName`)} aria-invalid={!!errors.lines?.[index]?.itemName}/>{errors.lines?.[index]?.itemName && <span role="alert" className="field-error">{errors.lines[index]?.itemName?.message}</span>}</label>
    <label><span className="sr-only">{t.foodIdSr.replace("{index}", String(index + 1))}</span><input {...register(`lines.${index}.foodId`)} placeholder={t.optionalPlaceholder} autoComplete="off"/></label>
    <label><span className="sr-only">{t.quantitySr.replace("{index}", String(index + 1))}</span><input {...register(`lines.${index}.quantity`)} type="number" min="0.001" step="0.001" inputMode="decimal" aria-invalid={!!errors.lines?.[index]?.quantity}/>{errors.lines?.[index]?.quantity && <span role="alert" className="field-error">{errors.lines[index]?.quantity?.message}</span>}</label>
    <label><span className="sr-only">{t.unitSr.replace("{index}", String(index + 1))}</span><input {...register(`lines.${index}.unit`)} placeholder={t.unitPlaceholder} autoComplete="off" aria-invalid={!!errors.lines?.[index]?.unit}/>{errors.lines?.[index]?.unit && <span role="alert" className="field-error">{errors.lines[index]?.unit?.message}</span>}</label>
    <label><span className="sr-only">{t.unitPriceSr.replace("{index}", String(index + 1))}</span><input {...register(`lines.${index}.unitPrice`)} type="number" min="0" step="0.01" inputMode="decimal" aria-invalid={!!errors.lines?.[index]?.unitPrice}/></label>
  </div>)}</div><div className="warehouse-form-actions"><button type="button" className="secondary-button" onClick={() => append({ ...emptyLine })}>{t.addLine}</button><label className="warehouse-note">{t.note}<input {...register("note")} placeholder={t.notePlaceholder} autoComplete="off"/></label><button className="primary-action" disabled={pending}>{pending ? t.saving : t.saveNow}</button></div></form>;
}
