import type { DocumentKind, FeedingRoute, InventoryType, Prisma, Role } from "@prisma/client";
import { evidenceStorage } from "./evidence-storage";
import { buildDietMealShopping } from "./kitchen";
import { prisma } from "./prisma";

export type WarehouseMode = "A" | "B";
export type WarehouseActor = { id: string; displayName: string; role: Role };
export type TransactionLineInput = { id?: string; foodId?: string | null; itemName: string; quantity: number; unit: string; unitPrice?: number | null };

const ALLOWED_ROLES = new Set<Role>(["ADMIN", "DIETITIAN", "KITCHEN"]);
const TRANSACTION_TYPES = new Set<InventoryType>(["IN", "OUT", "ADJUST"]);

export function requireWarehouseRole(role: Role): void {
  if (!ALLOWED_ROLES.has(role)) throw new Error("Bạn không có quyền thao tác kho.");
}

export function parseWarehouseMode(value: unknown): WarehouseMode {
  if (value === "B") return "B";
  if (value && typeof value === "object" && "mode" in value && (value as { mode?: unknown }).mode === "B") return "B";
  return "A";
}

export function warehouseKindForRoute(mode: WarehouseMode, route: FeedingRoute): "GENERAL" | "KITCHEN" | "SONDE" {
  if (mode === "A") return "GENERAL";
  return route === "SONDE" ? "SONDE" : "KITCHEN";
}

export function inventoryVariance(expected: number | null | undefined, actual: number | null | undefined): number | null {
  if (expected == null || actual == null || !Number.isFinite(expected) || !Number.isFinite(actual)) return null;
  return actual - expected;
}

export function assertNoHardDelete(operation: string): void {
  if (operation.toUpperCase() === "DELETE") throw new Error("Giao dịch kho không được xóa. Hãy hủy hoặc tạo điều chỉnh.");
}

function normalizeLine(line: TransactionLineInput): TransactionLineInput {
  const itemName = line.itemName.trim();
  const unit = line.unit.trim();
  if (!itemName || itemName.length > 200) throw new Error("Tên thực phẩm phải có từ 1 đến 200 ký tự.");
  if (!unit || unit.length > 30) throw new Error("Đơn vị phải có từ 1 đến 30 ký tự.");
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new Error(`Số lượng của ${itemName} phải lớn hơn 0.`);
  if (line.unitPrice != null && (!Number.isFinite(line.unitPrice) || line.unitPrice < 0)) throw new Error(`Đơn giá của ${itemName} không hợp lệ.`);
  return { ...line, itemName, unit, foodId: line.foodId || null, quantity: line.quantity, unitPrice: line.unitPrice ?? null };
}

function lineSnapshot(lines: Array<{ id: string; foodId: string | null; itemName: string; quantity: Prisma.Decimal; unit: string; unitPrice: Prisma.Decimal | null }>) {
  return lines.map((line) => ({ id: line.id, foodId: line.foodId, itemName: line.itemName, quantity: Number(line.quantity), unit: line.unit, unitPrice: line.unitPrice == null ? null : Number(line.unitPrice) }));
}

async function readMode(client: Prisma.TransactionClient | typeof prisma = prisma): Promise<WarehouseMode> {
  const setting = await client.appSetting.findUnique({ where: { key: "warehouseMode" }, select: { valueJson: true } });
  return parseWarehouseMode(setting?.valueJson);
}

async function assertWarehouseRoute(client: Prisma.TransactionClient, warehouseId: string, relatedDietMealId: string | null) {
  const [mode, warehouse, meal] = await Promise.all([
    readMode(client),
    client.warehouse.findFirst({ where: { id: warehouseId, status: "ACTIVE" }, select: { id: true, kind: true } }),
    relatedDietMealId ? client.dietMeal.findFirst({ where: { id: relatedDietMealId, voidedAt: null }, select: { id: true, feedingRoute: true } }) : null,
  ]);
  if (!warehouse) throw new Error("Kho không tồn tại hoặc đã vô hiệu.");
  const expectedKind = meal ? warehouseKindForRoute(mode, meal.feedingRoute) : null;
  if (relatedDietMealId && !meal) throw new Error("Bữa ăn liên kết không tồn tại.");
  if (expectedKind && warehouse.kind !== expectedKind) throw new Error("Kho không phù hợp với đường nuôi của bữa ăn.");
  if (!meal && mode === "A" && warehouse.kind !== "GENERAL") throw new Error("Mode A chỉ sử dụng kho tổng.");
  if (!meal && mode === "B" && warehouse.kind === "GENERAL") throw new Error("Mode B phải chọn kho bếp hoặc kho sonde.");
}

export async function createInventoryTransaction(input: { warehouseId: string; type: InventoryType; occurredAt: Date; relatedDietMealId?: string | null; note?: string | null; lines: TransactionLineInput[] }, actor: WarehouseActor) {
  requireWarehouseRole(actor.role);
  if (!TRANSACTION_TYPES.has(input.type)) throw new Error("Loại giao dịch kho không hợp lệ.");
  if (!(input.occurredAt instanceof Date) || Number.isNaN(input.occurredAt.getTime())) throw new Error("Thời điểm giao dịch không hợp lệ.");
  const lines = input.lines.map(normalizeLine);
  if (lines.length === 0) throw new Error("Cần ít nhất một dòng thực phẩm.");
  return prisma.$transaction(async (tx) => {
    await assertWarehouseRoute(tx, input.warehouseId, input.relatedDietMealId ?? null);
    const transaction = await tx.inventoryTransaction.create({ data: { warehouseId: input.warehouseId, type: input.type, occurredAt: input.occurredAt, createdById: actor.id, relatedDietMealId: input.relatedDietMealId || null, note: input.note?.trim().slice(0, 500) || null, lines: { create: lines.map((line) => ({ foodId: line.foodId, itemName: line.itemName, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice })) } }, include: { lines: true } });
    await tx.auditLog.create({ data: { entityType: "InventoryTransaction", entityId: transaction.id, action: "CREATE", actorId: actor.id, actorName: actor.displayName, afterJson: { warehouseId: transaction.warehouseId, type: transaction.type, occurredAt: transaction.occurredAt, relatedDietMealId: transaction.relatedDietMealId, note: transaction.note, status: transaction.status, lines: lineSnapshot(transaction.lines) } as unknown as Prisma.InputJsonValue, reason: `Lưu nhanh giao dịch ${transaction.type}` } });
    return transaction;
  });
}

export async function updateInventoryTransaction(input: { id: string; occurredAt: Date; note?: string | null; lines: TransactionLineInput[] }, actor: WarehouseActor) {
  requireWarehouseRole(actor.role);
  const lines = input.lines.map(normalizeLine);
  if (!lines.length) throw new Error("Cần giữ ít nhất một dòng thực phẩm.");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryTransaction.findUnique({ where: { id: input.id }, include: { lines: true } });
    if (!existing || existing.status !== "ACTIVE") throw new Error("Chỉ sửa được giao dịch đang hoạt động.");
    const known = new Set(existing.lines.map((line) => line.id));
    for (const line of lines) if (line.id && !known.has(line.id)) throw new Error("Dòng giao dịch không thuộc chứng từ này.");
    for (const current of existing.lines) {
      const line = lines.find((item) => item.id === current.id);
      if (!line) throw new Error("Không được xóa dòng đã lưu. Hãy hủy hoặc tạo giao dịch điều chỉnh.");
      await tx.inventoryTransactionLine.update({ where: { id: current.id }, data: { foodId: line.foodId, itemName: line.itemName, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice } });
    }
    const additions = lines.filter((line) => !line.id);
    if (additions.length) await tx.inventoryTransactionLine.createMany({ data: additions.map((line) => ({ transactionId: existing.id, foodId: line.foodId, itemName: line.itemName, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice })) });
    const updated = await tx.inventoryTransaction.update({ where: { id: existing.id }, data: { occurredAt: input.occurredAt, note: input.note?.trim().slice(0, 500) || null }, include: { lines: true } });
    await tx.auditLog.create({ data: { entityType: "InventoryTransaction", entityId: existing.id, action: "UPDATE", actorId: actor.id, actorName: actor.displayName, beforeJson: { occurredAt: existing.occurredAt, note: existing.note, lines: lineSnapshot(existing.lines) } as unknown as Prisma.InputJsonValue, afterJson: { occurredAt: updated.occurredAt, note: updated.note, lines: lineSnapshot(updated.lines) } as unknown as Prisma.InputJsonValue, reason: "Sửa giao dịch sau khi lưu nhanh" } });
    return updated;
  });
}

export async function voidInventoryTransaction(id: string, reason: string, actor: WarehouseActor) {
  requireWarehouseRole(actor.role);
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 500) throw new Error("Lý do hủy phải có từ 3 đến 500 ký tự.");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryTransaction.findUnique({ where: { id }, include: { lines: true } });
    if (!existing || existing.status !== "ACTIVE") throw new Error("Giao dịch không tồn tại hoặc đã hủy.");
    const updated = await tx.inventoryTransaction.update({ where: { id }, data: { status: "CANCELLED", voidedById: actor.id, voidedAt: new Date(), voidedReason: cleanReason } });
    await tx.auditLog.create({ data: { entityType: "InventoryTransaction", entityId: id, action: "CANCEL", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: existing.status, lines: lineSnapshot(existing.lines) } as unknown as Prisma.InputJsonValue, afterJson: { status: updated.status, voidedById: actor.id, voidedAt: updated.voidedAt, voidedReason: cleanReason } as unknown as Prisma.InputJsonValue, reason: cleanReason } });
    return updated;
  });
}

export async function attachInventoryDocument(input: { transactionId: string; kind: DocumentKind; file: File; note?: string | null }, actor: WarehouseActor) {
  requireWarehouseRole(actor.role);
  const stored = await evidenceStorage.store(input.file);
  if (!stored) return { stored: false as const };
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.inventoryTransaction.findFirst({ where: { id: input.transactionId, status: "ACTIVE" }, select: { id: true } });
    if (!transaction) throw new Error("Không tìm thấy giao dịch đang hoạt động.");
    const document = await tx.document.create({ data: { transactionId: transaction.id, kind: input.kind, storagePath: stored.storagePath, note: input.note?.trim().slice(0, 500) || null } });
    await tx.auditLog.create({ data: { entityType: "Document", entityId: document.id, action: "UPLOAD", actorId: actor.id, actorName: actor.displayName, afterJson: { transactionId: transaction.id, kind: document.kind, storagePath: document.storagePath, note: document.note } as Prisma.InputJsonValue, reason: "Đính kèm chứng từ kho" } });
  });
  return { stored: true as const };
}

export function expectedIssueForMeal(meal: { id: string; dietTypeId: string; dietName: string; servings: number; menuSnapshotJson: unknown }) {
  const result = buildDietMealShopping([{ id: meal.id, dietTypeId: meal.dietTypeId, dietName: meal.dietName, servingsPlanned: meal.servings, menuSnapshotJson: meal.menuSnapshotJson }]);
  return { items: result.items, warnings: result.incomplete.map((item) => item.reason) };
}

export async function readWarehousePage() {
  const mode = await readMode();
  const warehouses = await prisma.warehouse.findMany({ where: { status: "ACTIVE", kind: mode === "A" ? "GENERAL" : { in: ["KITCHEN", "SONDE"] } }, orderBy: { kind: "asc" } });
  const [transactions, meals] = await Promise.all([
    prisma.inventoryTransaction.findMany({ orderBy: { occurredAt: "desc" }, take: 30, include: { warehouse: true, createdBy: { select: { displayName: true } }, lines: { orderBy: { id: "asc" } }, documents: true, relatedDietMeal: { select: { id: true, feedingRoute: true, servingsPlanned: true, menuSnapshotJson: true, dietTypeId: true, dietType: { select: { name: true } }, mealEvent: { select: { mealDate: true, mealType: { select: { name: true } } } } } } } }),
    prisma.dietMeal.findMany({ where: { voidedAt: null, status: { in: ["PLANNED", "LOCKED", "PREPARING", "PREPARED"] } }, orderBy: { mealEvent: { mealDate: "desc" } }, take: 30, select: { id: true, feedingRoute: true, servingsPlanned: true, menuSnapshotJson: true, dietTypeId: true, dietType: { select: { name: true } }, mealEvent: { select: { mealDate: true, mealType: { select: { name: true } } } } } }),
  ]);
  const comparisons = transactions.filter((item) => item.type === "OUT" && item.status === "ACTIVE" && item.relatedDietMeal).map((transaction) => {
    const meal = transaction.relatedDietMeal!;
    const expected = expectedIssueForMeal({ id: meal.id, dietTypeId: meal.dietTypeId, dietName: meal.dietType.name, servings: meal.servingsPlanned, menuSnapshotJson: meal.menuSnapshotJson });
    const expectedByFood = new Map(expected.items.map((item) => [item.foodId, item.rawGrams]));
    return { transactionId: transaction.id, warnings: expected.warnings, lines: transaction.lines.map((line) => { const actual = line.unit.toLowerCase() === "g" ? Number(line.quantity) : null; const expectedQuantity = line.foodId ? expectedByFood.get(line.foodId) ?? null : null; return { id: line.id, itemName: line.itemName, unit: line.unit, expected: expectedQuantity, actual, variance: inventoryVariance(expectedQuantity, actual) }; }) };
  });
  return { mode, warehouses, transactions, meals, comparisons };
}
