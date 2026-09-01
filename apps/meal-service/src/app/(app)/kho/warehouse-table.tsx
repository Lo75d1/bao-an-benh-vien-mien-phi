"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";

type Action = (data: FormData) => Promise<void>;
type Line = { id: string; itemName: string; foodId: string; quantity: string; unit: string; unitPrice: string };
type Comparison = { lines: { id: string; itemName: string; expected: number | null; actual: number | null; variance: number | null }[]; warnings: string[] } | null;
export type WarehouseRow = { id: string; occurredAt: string; occurredAtInput: string; type: string; warehouse: string; creator: string; lineCount: number; status: "ACTIVE" | "CANCELLED"; statusLabel: string; note: string; lines: Line[]; documents: string[]; voidedReason: string; comparison: Comparison };

export function WarehouseTable({ data, updateAction, uploadAction, cancelAction }: { data: WarehouseRow[]; updateAction: Action; uploadAction: Action; cancelAction: Action }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management.warehouseTable;
  const dateTime = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
  const number = new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", { maximumFractionDigits: 3 });
  const columns: ColumnDef<WarehouseRow, unknown>[] = [
    { accessorKey: "occurredAt", header: t.time, cell: ({ row }) => <time dateTime={row.original.occurredAt} className="tabular-nums">{dateTime.format(new Date(row.original.occurredAt))}</time> },
    { accessorKey: "type", header: t.type },
    { accessorKey: "warehouse", header: t.warehouse },
    { accessorKey: "creator", header: t.creator },
    { accessorKey: "lineCount", header: t.lineCount, meta: { numeric: true } },
    { accessorKey: "statusLabel", header: t.status },
    { id: "actions", header: t.actions, enableSorting: false, cell: ({ row }) => {
      const transaction = row.original;
      const active = transaction.status === "ACTIVE";
      return <Dialog><DialogTrigger asChild><button type="button" className="secondary-button">{active ? t.edit : t.view}</button></DialogTrigger><DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto"><DialogHeader><DialogTitle>{transaction.type} · {transaction.warehouse}</DialogTitle><DialogDescription>{dateTime.format(new Date(transaction.occurredAt))} · {transaction.creator} · {transaction.statusLabel}</DialogDescription></DialogHeader><div className="transaction-detail">
        <form action={updateAction} className="transaction-edit"><input type="hidden" name="transactionId" value={transaction.id}/><div className="transaction-meta"><label>{t.time}<input name="occurredAt" type="datetime-local" defaultValue={transaction.occurredAtInput} required disabled={!active}/></label><label>{t.note}<input name="note" defaultValue={transaction.note} maxLength={500} disabled={!active}/></label></div><div className="warehouse-lines"><div className="warehouse-line warehouse-line-head"><span>{t.food}</span><span>{t.foodCode}</span><span>{t.quantity}</span><span>{t.unit}</span><span>{t.unitPrice}</span></div>{transaction.lines.map((line) => <div className="warehouse-line" key={line.id}><input type="hidden" name="lineId" value={line.id}/><input name="itemName" defaultValue={line.itemName} required disabled={!active}/><input name="foodId" defaultValue={line.foodId} disabled={!active}/><input name="quantity" type="number" min="0.001" step="0.001" defaultValue={line.quantity} required disabled={!active}/><input name="unit" defaultValue={line.unit} required disabled={!active}/><input name="unitPrice" type="number" min="0" step="0.01" defaultValue={line.unitPrice} disabled={!active}/></div>)}{active && <div className="warehouse-line"><input type="hidden" name="lineId"/><input name="itemName" aria-label={t.extraLineName} placeholder={t.extraLinePlaceholder}/><input name="foodId" aria-label={t.extraLineFoodCode}/><input name="quantity" aria-label={t.extraLineQuantity} type="number" min="0.001" step="0.001"/><input name="unit" aria-label={t.extraLineUnit}/><input name="unitPrice" aria-label={t.extraLineUnitPrice} type="number" min="0" step="0.01"/></div>}</div>{active && <button className="secondary-button">{t.saveChanges}</button>}</form>
        {transaction.comparison && <section className="variance-panel" aria-label={t.varianceLabel}><h3>{t.varianceLabel}</h3><div className="variance-table"><div className="variance-head"><span>{t.food}</span><span>{t.expected}</span><span>{t.actual}</span><span>{t.variance}</span></div>{transaction.comparison.lines.map((line) => <div key={line.id}><strong>{line.itemName}</strong><span>{line.expected == null ? "—" : `${number.format(line.expected)} g`}</span><span>{line.actual == null ? "—" : `${number.format(line.actual)} g`}</span><span className={line.variance == null ? "missing" : line.variance > 0 ? "variance-high" : line.variance < 0 ? "variance-low" : ""}>{line.variance == null ? "—" : `${line.variance > 0 ? "+" : ""}${number.format(line.variance)} g`}</span></div>)}</div>{transaction.comparison.warnings.length > 0 && <p className="data-warning" role="alert">{t.missingExpected.replace("{warnings}", transaction.comparison.warnings.join(" "))}</p>}</section>}
        <div className="transaction-support"><section><h3>{t.documents}</h3><p>{transaction.documents.length ? transaction.documents.join(", ") : "—"}</p>{active && <form action={uploadAction} encType="multipart/form-data" className="document-form"><input type="hidden" name="transactionId" value={transaction.id}/><select name="kind" aria-label={t.documentKind}><option value="BILL">Bill</option><option value="INVOICE">{t.invoice}</option><option value="PHOTO">{t.photo}</option><option value="OTHER">{t.other}</option></select><input name="file" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" required/><input name="documentNote" maxLength={500} placeholder={t.documentNote}/><button className="secondary-button">{t.attach}</button></form>}</section>{active && <section><h3>{t.cancelTitle}</h3><form action={cancelAction} className="cancel-form"><input type="hidden" name="transactionId" value={transaction.id}/><input name="reason" minLength={3} maxLength={500} required placeholder={t.cancelReasonPlaceholder}/><button className="danger-button">{t.cancelButton}</button></form></section>}</div>{!active && <p className="cancel-reason">{t.cancelReason.replace("{reason}", transaction.voidedReason || "—")}</p>}
      </div></DialogContent></Dialog>;
    } },
  ];
  return <DataTable columns={columns} data={data} getRowId={(row) => row.id} filterPlaceholder={t.filterPlaceholder} emptyMessage={t.emptyMessage}/>;
}
