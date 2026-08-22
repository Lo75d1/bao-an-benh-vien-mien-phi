import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { readWarehousePage } from "@/lib/warehouse";
import { cancelTransactionAction, updateTransactionAction, uploadDocumentAction } from "./actions";
import { QuickEntry } from "./quick-entry";
import { WarehouseTable } from "./warehouse-table";
const date = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
const typeLabel = { IN: "Nhập", OUT: "Xuất", ADJUST: "Điều chỉnh" } as const;
const documentLabel = { BILL: "Bill", INVOICE: "Hóa đơn", PHOTO: "Ảnh", OTHER: "Khác" } as const;
const localInput = (value: Date) => new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
export default async function WarehousePage({ searchParams }: { searchParams: Promise<{ updated?: string; storage?: string }> }) {
 const user = await getSessionUser(); if (!user) redirect("/"); if (!["ADMIN", "DIETITIAN", "KITCHEN"].includes(user.role)) redirect("/");
 const [data, query] = await Promise.all([readWarehousePage(), searchParams]);
 const comparisonMap = new Map(data.comparisons.map((item) => [item.transactionId, item]));
 const mealOptions = data.meals.map((meal) => ({ id: meal.id, feedingRoute: meal.feedingRoute, label: `${meal.mealEvent.mealType.name} ${date.format(meal.mealEvent.mealDate)} - ${meal.dietType.name}` }));
 const success = query.updated === "created" ? "Đã lưu giao dịch và nhật ký." : query.updated === "edited" ? "Đã cập nhật giao dịch và nhật ký." : query.updated === "cancelled" ? "Đã hủy giao dịch, dữ liệu lịch sử vẫn được giữ." : query.updated === "document" ? "Đã lưu chứng từ và nhật ký." : null;
 const rows = data.transactions.map((transaction) => { const comparison = comparisonMap.get(transaction.id); return { id: transaction.id, occurredAt: transaction.occurredAt.toISOString(), occurredAtInput: localInput(transaction.occurredAt), type: typeLabel[transaction.type], warehouse: transaction.warehouse.name, creator: transaction.createdBy.displayName, lineCount: transaction.lines.length, status: transaction.status === "CANCELLED" ? "CANCELLED" as const : "ACTIVE" as const, statusLabel: transaction.status === "CANCELLED" ? "Đã hủy" : "Đang hoạt động", note: transaction.note ?? "", lines: transaction.lines.map((line) => ({ id: line.id, itemName: line.itemName, foodId: line.foodId ?? "", quantity: String(line.quantity), unit: line.unit, unitPrice: line.unitPrice == null ? "" : String(line.unitPrice) })), documents: transaction.documents.map((document) => documentLabel[document.kind]), voidedReason: transaction.voidedReason ?? "", comparison: comparison ? { lines: comparison.lines, warnings: comparison.warnings } : null }; });
 return <AppShell user={user}><main className="workspace warehouse-page"><PageHeader eyebrow="Bàn làm việc kho" title="Giao dịch và đối chiếu nguyên liệu" description="Xem lịch sử trước, mở biểu mẫu khi cần ghi nhận một giao dịch mới." actions={<p className="scope-note">{data.mode === "A" ? "Một kho tổng" : "Tách kho bếp và kho sonde"} · <strong>{data.transactions.length}</strong> giao dịch gần đây</p>}/>
  {success && <p className="success-banner" role="status">{success}</p>}{query.storage === "unavailable" && <p className="storage-notice" role="status">Chứng từ đang nằm im vì máy chủ chưa cấu hình nơi lưu. Giao dịch kho không bị thay đổi.</p>}
  <section className="warehouse-history" aria-labelledby="warehouse-history-heading"><div className="section-heading"><div><p className="eyebrow">Lịch sử</p><h2 id="warehouse-history-heading">Giao dịch gần đây</h2></div><span>{data.transactions.length ? `${data.transactions.length} giao dịch` : "—"}</span></div><WarehouseTable data={rows} updateAction={updateTransactionAction} uploadAction={uploadDocumentAction} cancelAction={cancelTransactionAction}/></section>
  {data.warehouses.length === 0 ? <section className="empty-state"><h2>—</h2><p>Chưa có kho hoạt động phù hợp với Mode {data.mode}. Cần cấu hình dữ liệu trước khi nhập.</p></section> : <details className="warehouse-entry"><summary><span><small>Giao dịch mới</small><strong>Nhập, xuất hoặc điều chỉnh kho</strong></span><em>Mở biểu mẫu</em></summary><div className="section-heading"><div><p className="eyebrow">Nhập nhanh</p><h2 id="quick-entry-heading">Lưu trước, bổ sung chứng từ sau</h2></div><span>Không bắt buộc đọc bill</span></div><QuickEntry warehouses={data.warehouses} meals={mealOptions} defaultOccurredAt={localInput(new Date())}/></details>}
 </main></AppShell>;
}
