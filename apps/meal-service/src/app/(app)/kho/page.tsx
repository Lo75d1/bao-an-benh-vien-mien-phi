import { FileText, Plus, ReceiptText } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getSessionUser } from "@/lib/auth";
import { readWarehousePage } from "@/lib/warehouse";
import { saveInvoiceAction } from "./actions";
import { InvoiceSaveForm } from "./invoice-save-form";

const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
const localInput = (value: Date) => new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export default async function WarehousePage({ searchParams }: { searchParams: Promise<{ updated?: string; storage?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!["ADMIN", "DIETITIAN", "KITCHEN"].includes(user.role)) redirect("/");
  const [data, query] = await Promise.all([readWarehousePage(), searchParams]);
  const invoices = data.transactions.flatMap((transaction) => transaction.documents.filter((document) => document.kind === "INVOICE").map((document) => ({ id: document.id, occurredAt: transaction.occurredAt, warehouse: transaction.warehouse.name, creator: transaction.createdBy.displayName, note: document.note || transaction.note, active: transaction.status === "ACTIVE" })));
  const defaultWarehouse = data.warehouses[0] ?? null;
  const upload = <Dialog><DialogTrigger asChild><button type="button" className="primary-action" disabled={!defaultWarehouse}><Plus/> Lưu hóa đơn</button></DialogTrigger><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Lưu hóa đơn vào hệ thống</DialogTitle><DialogDescription>Chụp ảnh hoặc chọn PDF. Hệ thống chỉ lưu để tra lại, không tự cộng trừ tồn kho.</DialogDescription></DialogHeader>{defaultWarehouse ? <InvoiceSaveForm warehouseId={defaultWarehouse.id} defaultOccurredAt={localInput(new Date())} action={saveInvoiceAction}/> : <p className="storage-notice">Chưa có kho hoạt động để gắn hóa đơn.</p>}</DialogContent></Dialog>;
  return <AppShell user={user}><main className="workspace warehouse-page invoice-archive"><Separator className="page-separator" aria-hidden="true"/><header className="invoice-toolbar"><div><p className="eyebrow">Kho chứng từ</p><h1>Hóa đơn đã lưu</h1><span>Admin · Dinh dưỡng · Bếp</span></div>{upload}</header>
    {query.updated === "invoice" ? <p className="success-banner" role="status">Đã lưu hóa đơn và ghi nhật ký.</p> : null}
    {query.storage === "unavailable" ? <p className="storage-notice" role="alert">Không lưu được tệp. Chỉ nhận JPG, PNG, WEBP hoặc PDF tối đa 10 MB.</p> : null}
    <section className="invoice-list-panel"><div className="section-heading"><div><p className="eyebrow">Gần đây</p><h2>Danh sách hóa đơn</h2></div><span>{invoices.length ? `${invoices.length} hóa đơn` : "—"}</span></div>
      {invoices.length ? <div className="invoice-list" role="list">{invoices.map((invoice) => <article key={invoice.id} role="listitem"><FileText/><div><strong>{invoice.note || "Hóa đơn không ghi chú"}</strong><span>{dateTime.format(invoice.occurredAt)} · {invoice.creator} · {invoice.warehouse}</span></div><a href={`/api/documents/${invoice.id}`} target="_blank" rel="noreferrer">Xem hóa đơn</a></article>)}</div> : <div className="invoice-empty"><ReceiptText/><strong>Chưa có hóa đơn</strong><span>Bấm “Lưu hóa đơn” để chụp hoặc chọn tệp đầu tiên.</span></div>}
    </section>
  </main></AppShell>;
}
