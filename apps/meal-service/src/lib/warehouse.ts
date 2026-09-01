import type { DocumentKind, FeedingRoute, InventoryType, Prisma, Role } from "@prisma/client";
import { evidenceStorage } from "./evidence-storage";
import { buildDietMealShopping } from "./kitchen";
import { prisma } from "./prisma";
import { readOperationalSettings } from "./settings";
import { demoWarehouseBotEvents, demoWarehouseStockBalances } from "./demo-warehouse-bot";

export type WarehouseMode = "A" | "B";
export type WarehouseActor = { id: string; displayName: string; role: Role };
export type TransactionLineInput = { id?: string; foodId?: string | null; itemName: string; quantity: number; unit: string; unitPrice?: number | null };
export type WarehouseMessages = {
  noDelete: string;
  itemNameLength: string;
  unitLength: string;
  quantityPositive: string;
  invalidUnitPrice: string;
  warehouseNotFound: string;
  linkedMealNotFound: string;
  routeMismatch: string;
  modeAGeneralOnly: string;
  modeBKitchenOnly: string;
  invalidTransactionType: string;
  invalidOccurredAt: string;
  atLeastOneFoodLine: string;
  keepOneFoodLine: string;
  editActiveOnly: string;
  lineMismatch: string;
  noSavedLineDelete: string;
  adminOnlyCancel: string;
  cancelReasonLength: string;
  transactionNotFound: string;
  activeTransactionNotFound: string;
  invalidInvoiceDate: string;
};

const ALLOWED_ROLES = new Set<Role>(["ADMIN", "DIETITIAN", "KITCHEN"]);
const TRANSACTION_TYPES = new Set<InventoryType>(["IN", "OUT", "ADJUST"]);
const DEFAULT_MESSAGES: WarehouseMessages = {
  noDelete: "Giao dịch kho không được xóa. Hãy hủy hoặc tạo điều chỉnh.",
  itemNameLength: "Tên thực phẩm phải có từ 1 đến 200 ký tự.",
  unitLength: "Đơn vị phải có từ 1 đến 30 ký tự.",
  quantityPositive: "Số lượng của {item} phải lớn hơn 0.",
  invalidUnitPrice: "Đơn giá của {item} không hợp lệ.",
  warehouseNotFound: "Kho không tồn tại hoặc đã vô hiệu.",
  linkedMealNotFound: "Bữa ăn liên kết không tồn tại.",
  routeMismatch: "Kho không phù hợp với đường nuôi của bữa ăn.",
  modeAGeneralOnly: "Mode A chỉ sử dụng kho tổng.",
  modeBKitchenOnly: "Mode B phải chọn kho bếp hoặc kho sonde.",
  invalidTransactionType: "Loại giao dịch kho không hợp lệ.",
  invalidOccurredAt: "Thời điểm giao dịch không hợp lệ.",
  atLeastOneFoodLine: "Cần ít nhất một dòng thực phẩm.",
  keepOneFoodLine: "Cần giữ ít nhất một dòng thực phẩm.",
  editActiveOnly: "Chỉ sửa được giao dịch đang hoạt động.",
  lineMismatch: "Dòng giao dịch không thuộc chứng từ này.",
  noSavedLineDelete: "Không được xóa dòng đã lưu. Hãy hủy hoặc tạo giao dịch điều chỉnh.",
  adminOnlyCancel: "Chỉ quản trị viên được hủy giao dịch kho.",
  cancelReasonLength: "Lý do hủy phải có từ 3 đến 500 ký tự.",
  transactionNotFound: "Giao dịch không tồn tại hoặc đã hủy.",
  activeTransactionNotFound: "Không tìm thấy giao dịch đang hoạt động.",
  invalidInvoiceDate: "Ngày hóa đơn không hợp lệ.",
};

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
  if (operation.toUpperCase() === "DELETE") throw new Error(DEFAULT_MESSAGES.noDelete);
}

function normalizeLine(line: TransactionLineInput, messages: WarehouseMessages): TransactionLineInput {
  const itemName = line.itemName.trim();
  const unit = line.unit.trim();
  if (!itemName || itemName.length > 200) throw new Error(messages.itemNameLength);
  if (!unit || unit.length > 30) throw new Error(messages.unitLength);
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new Error(messages.quantityPositive.replace("{item}", itemName));
  if (line.unitPrice != null && (!Number.isFinite(line.unitPrice) || line.unitPrice < 0)) throw new Error(messages.invalidUnitPrice.replace("{item}", itemName));
  return { ...line, itemName, unit, foodId: line.foodId || null, quantity: line.quantity, unitPrice: line.unitPrice ?? null };
}

function lineSnapshot(lines: Array<{ id: string; foodId: string | null; itemName: string; quantity: Prisma.Decimal; unit: string; unitPrice: Prisma.Decimal | null }>) {
  return lines.map((line) => ({ id: line.id, foodId: line.foodId, itemName: line.itemName, quantity: Number(line.quantity), unit: line.unit, unitPrice: line.unitPrice == null ? null : Number(line.unitPrice) }));
}

async function readMode(client: Prisma.TransactionClient | typeof prisma = prisma): Promise<WarehouseMode> {
  return (await readOperationalSettings(client)).warehouseMode;
}

async function assertWarehouseRoute(client: Prisma.TransactionClient, warehouseId: string, relatedDietMealId: string | null, messages: WarehouseMessages) {
  const [mode, warehouse, meal] = await Promise.all([
    readMode(client),
    client.warehouse.findFirst({ where: { id: warehouseId, status: "ACTIVE" }, select: { id: true, kind: true } }),
    relatedDietMealId ? client.dietMeal.findFirst({ where: { id: relatedDietMealId, voidedAt: null }, select: { id: true, feedingRoute: true } }) : null,
  ]);
  if (!warehouse) throw new Error(messages.warehouseNotFound);
  const expectedKind = meal ? warehouseKindForRoute(mode, meal.feedingRoute) : null;
  if (relatedDietMealId && !meal) throw new Error(messages.linkedMealNotFound);
  if (expectedKind && warehouse.kind !== expectedKind) throw new Error(messages.routeMismatch);
  if (!meal && mode === "A" && warehouse.kind !== "GENERAL") throw new Error(messages.modeAGeneralOnly);
  if (!meal && mode === "B" && warehouse.kind === "GENERAL") throw new Error(messages.modeBKitchenOnly);
}

export async function createInventoryTransaction(input: { warehouseId: string; type: InventoryType; occurredAt: Date; relatedDietMealId?: string | null; note?: string | null; lines: TransactionLineInput[] }, actor: WarehouseActor, messages: WarehouseMessages = DEFAULT_MESSAGES) {
  requireWarehouseRole(actor.role);
  if (!TRANSACTION_TYPES.has(input.type)) throw new Error(messages.invalidTransactionType);
  if (!(input.occurredAt instanceof Date) || Number.isNaN(input.occurredAt.getTime())) throw new Error(messages.invalidOccurredAt);
  const lines = input.lines.map((line) => normalizeLine(line, messages));
  if (lines.length === 0) throw new Error(messages.atLeastOneFoodLine);
  return prisma.$transaction(async (tx) => {
    await assertWarehouseRoute(tx, input.warehouseId, input.relatedDietMealId ?? null, messages);
    const transaction = await tx.inventoryTransaction.create({ data: { warehouseId: input.warehouseId, type: input.type, occurredAt: input.occurredAt, createdById: actor.id, relatedDietMealId: input.relatedDietMealId || null, note: input.note?.trim().slice(0, 500) || null, lines: { create: lines.map((line) => ({ foodId: line.foodId, itemName: line.itemName, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice })) } }, include: { lines: true } });
    await tx.auditLog.create({ data: { entityType: "InventoryTransaction", entityId: transaction.id, action: "CREATE", actorId: actor.id, actorName: actor.displayName, afterJson: { warehouseId: transaction.warehouseId, type: transaction.type, occurredAt: transaction.occurredAt, relatedDietMealId: transaction.relatedDietMealId, note: transaction.note, status: transaction.status, lines: lineSnapshot(transaction.lines) } as unknown as Prisma.InputJsonValue, reason: `Lưu nhanh giao dịch ${transaction.type}` } });
    return transaction;
  });
}

export async function updateInventoryTransaction(input: { id: string; occurredAt: Date; note?: string | null; lines: TransactionLineInput[] }, actor: WarehouseActor, messages: WarehouseMessages = DEFAULT_MESSAGES) {
  requireWarehouseRole(actor.role);
  const lines = input.lines.map((line) => normalizeLine(line, messages));
  if (!lines.length) throw new Error(messages.keepOneFoodLine);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryTransaction.findUnique({ where: { id: input.id }, include: { lines: true } });
    if (!existing || existing.status !== "ACTIVE") throw new Error(messages.editActiveOnly);
    const known = new Set(existing.lines.map((line) => line.id));
    for (const line of lines) if (line.id && !known.has(line.id)) throw new Error(messages.lineMismatch);
    for (const current of existing.lines) {
      const line = lines.find((item) => item.id === current.id);
      if (!line) throw new Error(messages.noSavedLineDelete);
      await tx.inventoryTransactionLine.update({ where: { id: current.id }, data: { foodId: line.foodId, itemName: line.itemName, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice } });
    }
    const additions = lines.filter((line) => !line.id);
    if (additions.length) await tx.inventoryTransactionLine.createMany({ data: additions.map((line) => ({ transactionId: existing.id, foodId: line.foodId, itemName: line.itemName, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice })) });
    const updated = await tx.inventoryTransaction.update({ where: { id: existing.id }, data: { occurredAt: input.occurredAt, note: input.note?.trim().slice(0, 500) || null }, include: { lines: true } });
    await tx.auditLog.create({ data: { entityType: "InventoryTransaction", entityId: existing.id, action: "UPDATE", actorId: actor.id, actorName: actor.displayName, beforeJson: { occurredAt: existing.occurredAt, note: existing.note, lines: lineSnapshot(existing.lines) } as unknown as Prisma.InputJsonValue, afterJson: { occurredAt: updated.occurredAt, note: updated.note, lines: lineSnapshot(updated.lines) } as unknown as Prisma.InputJsonValue, reason: "Sửa giao dịch sau khi lưu nhanh" } });
    return updated;
  });
}

export async function voidInventoryTransaction(id: string, reason: string, actor: WarehouseActor, messages: WarehouseMessages = DEFAULT_MESSAGES) {
  requireWarehouseRole(actor.role);
  if (actor.role !== "ADMIN") throw new Error(messages.adminOnlyCancel);
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 500) throw new Error(messages.cancelReasonLength);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryTransaction.findUnique({ where: { id }, include: { lines: true } });
    if (!existing || existing.status !== "ACTIVE") throw new Error(messages.transactionNotFound);
    const updated = await tx.inventoryTransaction.update({ where: { id }, data: { status: "CANCELLED", voidedById: actor.id, voidedAt: new Date(), voidedReason: cleanReason } });
    await tx.auditLog.create({ data: { entityType: "InventoryTransaction", entityId: id, action: "CANCEL", actorId: actor.id, actorName: actor.displayName, beforeJson: { status: existing.status, lines: lineSnapshot(existing.lines) } as unknown as Prisma.InputJsonValue, afterJson: { status: updated.status, voidedById: actor.id, voidedAt: updated.voidedAt, voidedReason: cleanReason } as unknown as Prisma.InputJsonValue, reason: cleanReason } });
    return updated;
  });
}

export async function attachInventoryDocument(input: { transactionId: string; kind: DocumentKind; file: File; note?: string | null }, actor: WarehouseActor, messages: WarehouseMessages = DEFAULT_MESSAGES) {
  requireWarehouseRole(actor.role);
  const stored = await evidenceStorage.store(input.file);
  if (!stored) return { stored: false as const };
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.inventoryTransaction.findFirst({ where: { id: input.transactionId, status: "ACTIVE" }, select: { id: true } });
    if (!transaction) throw new Error(messages.activeTransactionNotFound);
    const document = await tx.document.create({ data: { transactionId: transaction.id, kind: input.kind, storagePath: stored.storagePath, note: input.note?.trim().slice(0, 500) || null } });
    await tx.auditLog.create({ data: { entityType: "Document", entityId: document.id, action: "UPLOAD", actorId: actor.id, actorName: actor.displayName, afterJson: { transactionId: transaction.id, kind: document.kind, storagePath: document.storagePath, note: document.note } as Prisma.InputJsonValue, reason: "Đính kèm chứng từ kho" } });
  });
  return { stored: true as const };
}

export async function saveWarehouseInvoice(input: { warehouseId: string; occurredAt: Date; file: File; note?: string | null }, actor: WarehouseActor, messages: WarehouseMessages = DEFAULT_MESSAGES) {
  requireWarehouseRole(actor.role);
  if (!(input.occurredAt instanceof Date) || Number.isNaN(input.occurredAt.getTime())) throw new Error(messages.invalidInvoiceDate);
  const stored = await evidenceStorage.store(input.file);
  if (!stored) return { stored: false as const };
  const cleanNote = input.note?.trim().slice(0, 500) || null;
  const result = await prisma.$transaction(async (tx) => {
    await assertWarehouseRoute(tx, input.warehouseId, null, messages);
    const transaction = await tx.inventoryTransaction.create({ data: { warehouseId: input.warehouseId, type: "IN", occurredAt: input.occurredAt, createdById: actor.id, note: cleanNote } });
    const document = await tx.document.create({ data: { transactionId: transaction.id, kind: "INVOICE", storagePath: stored.storagePath, note: cleanNote } });
    await tx.auditLog.create({ data: { entityType: "Document", entityId: document.id, action: "UPLOAD", actorId: actor.id, actorName: actor.displayName, afterJson: { transactionId: transaction.id, kind: document.kind, storagePath: document.storagePath, note: document.note } as Prisma.InputJsonValue, reason: "Lưu hóa đơn kho" } });
    return { transaction, document };
  });
  return { stored: true as const, ...result };
}

export function expectedIssueForMeal(meal: { id: string; dietTypeId: string; dietName: string; servings: number; menuSnapshotJson: unknown }) {
  const result = buildDietMealShopping([{ id: meal.id, dietTypeId: meal.dietTypeId, dietName: meal.dietName, servingsPlanned: meal.servings, menuSnapshotJson: meal.menuSnapshotJson }]);
  return { items: result.items, warnings: result.incomplete.map((item) => item.reason) };
}

export async function readWarehousePage(input?: { demoSessionId?: string | null; date?: string | Date; now?: Date }) {
  const mode = await readMode();
  const warehouses = await prisma.warehouse.findMany({ where: { status: "ACTIVE", kind: mode === "A" ? "GENERAL" : { in: ["KITCHEN", "SONDE"] } }, orderBy: { kind: "asc" } });
  const [transactions, meals, foods] = await Promise.all([
    prisma.inventoryTransaction.findMany({ orderBy: { occurredAt: "desc" }, take: 30, include: { warehouse: true, createdBy: { select: { displayName: true } }, lines: { orderBy: { id: "asc" } }, documents: true, relatedDietMeal: { select: { id: true, feedingRoute: true, servingsPlanned: true, menuSnapshotJson: true, dietTypeId: true, dietType: { select: { name: true } }, mealEvent: { select: { mealDate: true, mealType: { select: { name: true } } } } } } } }),
    prisma.dietMeal.findMany({ where: { voidedAt: null, status: { in: ["PLANNED", "LOCKED", "PREPARING", "PREPARED"] } }, orderBy: { mealEvent: { mealDate: "desc" } }, take: 30, select: { id: true, feedingRoute: true, servingsPlanned: true, menuSnapshotJson: true, dietTypeId: true, dietType: { select: { name: true } }, mealEvent: { select: { mealDate: true, mealType: { select: { name: true } } } } } }),
    input?.demoSessionId ? prisma.food.findMany({ select: { id: true, name: true, nameNormalized: true, aliases: { select: { alias: true, aliasNormalized: true } } } }) : Promise.resolve([]),
  ]);
  const comparisons = transactions.filter((item) => item.type === "OUT" && item.status === "ACTIVE" && item.relatedDietMeal).map((transaction) => {
    const meal = transaction.relatedDietMeal!;
    const expected = expectedIssueForMeal({ id: meal.id, dietTypeId: meal.dietTypeId, dietName: meal.dietType.name, servings: meal.servingsPlanned, menuSnapshotJson: meal.menuSnapshotJson });
    const expectedByFood = new Map(expected.items.map((item) => [item.foodId, item.rawGrams]));
    return { transactionId: transaction.id, warnings: expected.warnings, lines: transaction.lines.map((line) => { const actual = line.unit.toLowerCase() === "g" ? Number(line.quantity) : null; const expectedQuantity = line.foodId ? expectedByFood.get(line.foodId) ?? null : null; return { id: line.id, itemName: line.itemName, unit: line.unit, expected: expectedQuantity, actual, variance: inventoryVariance(expectedQuantity, actual) }; }) };
  });
  const botEvents = demoWarehouseBotEvents({ demoSessionId: input?.demoSessionId, date: input?.date ?? input?.now ?? new Date(), now: input?.now ?? new Date(), foods });
  const botStockBalances = demoWarehouseStockBalances(botEvents);
  return { mode, warehouses, transactions, meals, comparisons, botEvents, botStockBalances };
}
