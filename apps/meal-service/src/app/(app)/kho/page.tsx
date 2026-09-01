import { FileText, Plus, ReceiptText } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getSessionUser } from "@/lib/auth";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";
import { readWarehousePage } from "@/lib/warehouse";
import { saveInvoiceAction } from "./actions";

const localInput = (value: Date) => new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export default async function WarehousePage({ searchParams }: { searchParams: Promise<{ updated?: string; storage?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!["ADMIN", "DIETITIAN", "KITCHEN"].includes(user.role)) redirect("/");
  const locale = await readLocale();
  const t = getTranslations(locale).management.warehousePage;
  const dateTime = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
  const [data, query] = await Promise.all([readWarehousePage(), searchParams]);
  const invoices = data.transactions.flatMap((transaction) => transaction.documents.filter((document) => document.kind === "INVOICE").map((document) => ({ id: document.id, occurredAt: transaction.occurredAt, warehouse: transaction.warehouse.name, creator: transaction.createdBy.displayName, note: document.note || transaction.note, active: transaction.status === "ACTIVE" })));
  const defaultWarehouse = data.warehouses[0] ?? null;
  const storageMessage = query.storage === "invalid" ? t.invalidStorage : query.storage === "unavailable" ? t.unavailableStorage : null;
  const upload = <Dialog><DialogTrigger asChild><button type="button" className="primary-action" disabled={!defaultWarehouse}><Plus/> {t.saveInvoice}</button></DialogTrigger><DialogContent className="max-h-[calc(100dvh-1rem)] max-w-xl overflow-y-auto sm:max-h-[92dvh]"><DialogHeader><DialogTitle>{t.dialogTitle}</DialogTitle><DialogDescription>{t.dialogDescription}</DialogDescription></DialogHeader>{defaultWarehouse ? <form action={saveInvoiceAction} className="invoice-save-form"><input type="hidden" name="warehouseId" value={defaultWarehouse.id}/><label>{t.invoiceDate}<input name="occurredAt" type="datetime-local" defaultValue={localInput(new Date())} required/></label><label>{t.invoiceFile}<input name="file" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" required/></label><label>{t.note}<input name="note" maxLength={500} placeholder={t.notePlaceholder}/></label><button className="primary-action"><ReceiptText/> {t.saveInvoice}</button></form> : <p className="storage-notice">{t.noWarehouse}</p>}</DialogContent></Dialog>;
  return <AppShell user={user}><main className="workspace warehouse-page invoice-archive"><Separator className="page-separator" aria-hidden="true"/><header className="invoice-toolbar"><div><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><span>{t.subtitle}</span></div>{upload}</header>
    {query.updated === "invoice" ? <p className="success-banner" role="status">{t.invoiceSaved}</p> : null}
    {storageMessage ? <p className="storage-notice" role="alert">{storageMessage}</p> : null}
    <section className="invoice-list-panel"><div className="section-heading"><div><p className="eyebrow">{t.recent}</p><h2>{t.listTitle}</h2></div><span>{invoices.length ? t.invoiceCount.replace("{count}", String(invoices.length)) : "—"}</span></div>
      {invoices.length ? <div className="invoice-list" role="list">{invoices.map((invoice) => <article key={invoice.id} role="listitem"><FileText/><div><strong>{invoice.note || t.noInvoiceNote}</strong><span>{dateTime.format(invoice.occurredAt)} · {invoice.creator} · {invoice.warehouse}</span></div><a href={`/api/documents/${invoice.id}`} target="_blank" rel="noreferrer">{t.viewInvoice}</a></article>)}</div> : <div className="invoice-empty"><ReceiptText/><strong>{t.emptyTitle}</strong><span>{t.emptyDescription}</span></div>}
    </section>
  </main></AppShell>;
}
