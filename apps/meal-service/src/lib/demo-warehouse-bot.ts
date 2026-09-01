export type DemoWarehouseBillSlot = "morning" | "afternoon";
export type DemoWarehouseBotStatus = "WAITING" | "READING" | "RECOGNIZED" | "MATCHED" | "APPLIED";

export type DemoWarehouseBillLine = {
  originalLabel: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  preferredFoodName?: string;
};

export type DemoWarehouseBillSample = {
  id: string;
  imageUrl: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  lines: DemoWarehouseBillLine[];
};

export type DemoWarehouseFoodLookup = {
  id: string;
  name: string;
  nameNormalized?: string | null;
  aliases?: Array<{ alias: string; aliasNormalized?: string | null }>;
};

export type DemoWarehouseBotLine = DemoWarehouseBillLine & {
  id: string;
  matchedFoodId: string | null;
  matchedFoodName: string | null;
  matchSource: "FOOD_NAME" | "FOOD_ALIAS" | "PREDEFINED" | "UNMATCHED";
};

export type DemoWarehouseBotEvent = {
  id: string;
  slot: DemoWarehouseBillSlot;
  sample: DemoWarehouseBillSample;
  scheduledAt: string;
  processedAt: string;
  status: DemoWarehouseBotStatus;
  applied: boolean;
  lines: DemoWarehouseBotLine[];
  stockReceipt: {
    id: string;
    type: "IN";
    lineCount: number;
    totalQuantity: number;
    totalValue: number;
  } | null;
};

const SCHEDULE: Record<DemoWarehouseBillSlot, string> = {
  morning: "09:20:00",
  afternoon: "14:40:00",
};

export const DEMO_WAREHOUSE_BILL_SAMPLES: DemoWarehouseBillSample[] = [
  {
    id: "bill-01",
    imageUrl: "/demo/warehouse-bills/bill-01.jpg",
    supplierName: "Công ty TNHH Thực phẩm sạch An Phú",
    invoiceNumber: "AP250901-001",
    invoiceDate: "2025-09-01",
    total: 3440000,
    lines: [
      { originalLabel: "Thịt heo nạc vai", preferredFoodName: "Thịt heo nạc", quantity: 10, unit: "kg", unitPrice: 120000, total: 1200000 },
      { originalLabel: "Thịt gà ta", preferredFoodName: "Thịt gà", quantity: 8, unit: "kg", unitPrice: 95000, total: 760000 },
      { originalLabel: "Trứng gà (vỉ 10 quả)", preferredFoodName: "Trứng gà", quantity: 12, unit: "vỉ", unitPrice: 28000, total: 336000 },
      { originalLabel: "Sữa tươi Vinamilk hộp 1L", preferredFoodName: "Sữa tươi", quantity: 20, unit: "hộp", unitPrice: 24500, total: 490000 },
      { originalLabel: "Dầu ăn Meizan 2L", preferredFoodName: "Dầu ăn", quantity: 6, unit: "chai", unitPrice: 71000, total: 426000 },
      { originalLabel: "Nước mắm Chinsu 900ml", preferredFoodName: "Nước mắm", quantity: 6, unit: "chai", unitPrice: 38000, total: 228000 },
    ],
  },
  {
    id: "bill-02",
    imageUrl: "/demo/warehouse-bills/bill-02.jpg",
    supplierName: "Hợp tác xã Rau an toàn Hòa Vang",
    invoiceNumber: "RV250902-012",
    invoiceDate: "2025-09-02",
    total: 1210000,
    lines: [
      { originalLabel: "Rau cải ngọt", preferredFoodName: "Cải ngọt", quantity: 15, unit: "kg", unitPrice: 18000, total: 270000 },
      { originalLabel: "Rau muống", preferredFoodName: "Rau muống", quantity: 10, unit: "kg", unitPrice: 16000, total: 160000 },
      { originalLabel: "Bí đỏ", preferredFoodName: "Bí đỏ", quantity: 12, unit: "kg", unitPrice: 12000, total: 144000 },
      { originalLabel: "Cà chua", preferredFoodName: "Cà chua", quantity: 8, unit: "kg", unitPrice: 22000, total: 176000 },
      { originalLabel: "Khoai tây", preferredFoodName: "Khoai tây", quantity: 20, unit: "kg", unitPrice: 17000, total: 340000 },
      { originalLabel: "Hành lá", preferredFoodName: "Hành lá", quantity: 2, unit: "kg", unitPrice: 60000, total: 120000 },
    ],
  },
  {
    id: "bill-03",
    imageUrl: "/demo/warehouse-bills/bill-03.jpg",
    supplierName: "Công ty TNHH Hải sản Biển Xanh",
    invoiceNumber: "HS250903-008",
    invoiceDate: "2025-09-03",
    total: 5815000,
    lines: [
      { originalLabel: "Cá thu", preferredFoodName: "Cá thu", quantity: 15, unit: "kg", unitPrice: 85000, total: 1275000 },
      { originalLabel: "Tôm sú", preferredFoodName: "Tôm sú", quantity: 10, unit: "kg", unitPrice: 220000, total: 2200000 },
      { originalLabel: "Mực ống", preferredFoodName: "Mực", quantity: 8, unit: "kg", unitPrice: 180000, total: 1440000 },
      { originalLabel: "Cá nục", preferredFoodName: "Cá nục", quantity: 20, unit: "kg", unitPrice: 45000, total: 900000 },
    ],
  },
  {
    id: "bill-04",
    imageUrl: "/demo/warehouse-bills/bill-04.jpg",
    supplierName: "Cửa hàng Gạo sạch Minh Tâm",
    invoiceNumber: "GAO250904-015",
    invoiceDate: "2025-09-04",
    total: 3610000,
    lines: [
      { originalLabel: "Gạo thơm ST25", preferredFoodName: "Gạo tẻ", quantity: 100, unit: "kg", unitPrice: 23000, total: 2300000 },
      { originalLabel: "Gạo tẻ thường", preferredFoodName: "Gạo tẻ", quantity: 50, unit: "kg", unitPrice: 15000, total: 750000 },
      { originalLabel: "Gạo lứt", preferredFoodName: "Gạo lứt", quantity: 20, unit: "kg", unitPrice: 28000, total: 560000 },
    ],
  },
  {
    id: "bill-05",
    imageUrl: "/demo/warehouse-bills/bill-05.jpg",
    supplierName: "Công ty TNHH Thực phẩm Đại Phát",
    invoiceNumber: "DP250905-020",
    invoiceDate: "2025-09-05",
    total: 2919000,
    lines: [
      { originalLabel: "Mì gói Hảo Hảo", preferredFoodName: "Mì ăn liền", quantity: 10, unit: "thùng", unitPrice: 115000, total: 1150000 },
      { originalLabel: "Nước tương Nam Dương 1L", preferredFoodName: "Nước tương", quantity: 12, unit: "chai", unitPrice: 22000, total: 264000 },
      { originalLabel: "Hạt nêm Ajinomoto 400g", preferredFoodName: "Hạt nêm", quantity: 10, unit: "gói", unitPrice: 38000, total: 380000 },
      { originalLabel: "Bột ngọt Ajinomoto 1kg", preferredFoodName: "Bột ngọt", quantity: 5, unit: "gói", unitPrice: 55000, total: 275000 },
      { originalLabel: "Đường cát trắng", preferredFoodName: "Đường cát", quantity: 50, unit: "kg", unitPrice: 17000, total: 850000 },
    ],
  },
  {
    id: "bill-06",
    imageUrl: "/demo/warehouse-bills/bill-06.jpg",
    supplierName: "Cửa hàng Trái cây nhập khẩu Plus",
    invoiceNumber: "TC250906-011",
    invoiceDate: "2025-09-06",
    total: 2116000,
    lines: [
      { originalLabel: "Táo Fuji", preferredFoodName: "Táo", quantity: 10, unit: "kg", unitPrice: 65000, total: 650000 },
      { originalLabel: "Nho đen không hạt", preferredFoodName: "Nho", quantity: 8, unit: "kg", unitPrice: 95000, total: 760000 },
      { originalLabel: "Chuối già", preferredFoodName: "Chuối", quantity: 12, unit: "kg", unitPrice: 18000, total: 216000 },
      { originalLabel: "Dưa hấu", preferredFoodName: "Dưa hấu", quantity: 15, unit: "kg", unitPrice: 16000, total: 240000 },
      { originalLabel: "Cam sành", preferredFoodName: "Cam", quantity: 10, unit: "kg", unitPrice: 25000, total: 250000 },
    ],
  },
  {
    id: "bill-07",
    imageUrl: "/demo/warehouse-bills/bill-07.jpg",
    supplierName: "Công ty TNHH Sữa & Thực phẩm Dinh Dưỡng",
    invoiceNumber: "SD250907-009",
    invoiceDate: "2025-09-07",
    total: 2266000,
    lines: [
      { originalLabel: "Sữa tươi Vinamilk 110ml (48 hộp)", preferredFoodName: "Sữa tươi", quantity: 5, unit: "thùng", unitPrice: 192000, total: 960000 },
      { originalLabel: "Sữa chua Vinamilk", preferredFoodName: "Sữa chua", quantity: 10, unit: "hộp", unitPrice: 28000, total: 280000 },
      { originalLabel: "Phô mai Con bò cười", preferredFoodName: "Phô mai", quantity: 6, unit: "hộp", unitPrice: 35000, total: 210000 },
      { originalLabel: "Bơ thực vật 400g", preferredFoodName: "Bơ", quantity: 8, unit: "hộp", unitPrice: 32000, total: 256000 },
      { originalLabel: "Trứng gà (vỉ 10 quả)", preferredFoodName: "Trứng gà", quantity: 20, unit: "vỉ", unitPrice: 28000, total: 560000 },
    ],
  },
];

export function normalizeWarehouseBotText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function dateKey(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0] ?? value;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function scheduledAt(day: string, slot: DemoWarehouseBillSlot) {
  return new Date(`${day}T${SCHEDULE[slot]}+07:00`);
}

function statusAt(scheduled: Date, now: Date): DemoWarehouseBotStatus {
  const minutes = (now.getTime() - scheduled.getTime()) / 60_000;
  if (minutes < 0) return "WAITING";
  if (minutes < 5) return "READING";
  if (minutes < 10) return "RECOGNIZED";
  if (minutes < 15) return "MATCHED";
  return "APPLIED";
}

export function demoWarehouseBillIndex(input: { demoSessionId?: string | null; date: string | Date; slot: DemoWarehouseBillSlot }, count = DEMO_WAREHOUSE_BILL_SAMPLES.length) {
  if (!input.demoSessionId || count <= 0) return null;
  const day = dateKey(input.date);
  const first = stableHash(`${input.demoSessionId}|${day}|morning`) % count;
  if (input.slot === "morning" || count === 1) return first;
  const afternoon = stableHash(`${input.demoSessionId}|${day}|afternoon`) % count;
  return afternoon === first ? (afternoon + 1) % count : afternoon;
}

function matchLine(line: DemoWarehouseBillLine, foods: DemoWarehouseFoodLookup[]): Pick<DemoWarehouseBotLine, "matchedFoodId" | "matchedFoodName" | "matchSource"> {
  const names = new Map<string, DemoWarehouseFoodLookup>();
  const aliases = new Map<string, DemoWarehouseFoodLookup>();
  for (const food of foods) {
    names.set(food.nameNormalized ?? normalizeWarehouseBotText(food.name), food);
    for (const alias of food.aliases ?? []) aliases.set(alias.aliasNormalized ?? normalizeWarehouseBotText(alias.alias), food);
  }
  const original = normalizeWarehouseBotText(line.originalLabel);
  const preferred = line.preferredFoodName ? normalizeWarehouseBotText(line.preferredFoodName) : null;
  const exact = names.get(original);
  if (exact) return { matchedFoodId: exact.id, matchedFoodName: exact.name, matchSource: "FOOD_NAME" };
  const alias = aliases.get(original);
  if (alias) return { matchedFoodId: alias.id, matchedFoodName: alias.name, matchSource: "FOOD_ALIAS" };
  const predefined = preferred ? names.get(preferred) ?? aliases.get(preferred) : null;
  if (predefined) return { matchedFoodId: predefined.id, matchedFoodName: predefined.name, matchSource: "PREDEFINED" };
  return { matchedFoodId: null, matchedFoodName: null, matchSource: "UNMATCHED" };
}

export function demoWarehouseBotEvents(input: { demoSessionId?: string | null; date: string | Date; now: Date; foods?: DemoWarehouseFoodLookup[] }) {
  if (!input.demoSessionId) return [];
  const day = dateKey(input.date);
  return (["morning", "afternoon"] as const).flatMap((slot) => {
    const index = demoWarehouseBillIndex({ demoSessionId: input.demoSessionId, date: day, slot });
    if (index === null) return [];
    const sample = DEMO_WAREHOUSE_BILL_SAMPLES[index];
    const scheduled = scheduledAt(day, slot);
    const status = statusAt(scheduled, input.now);
    const lines = sample.lines.map((line, lineIndex) => ({
      id: `demo-warehouse-bot:${day}:${slot}:${sample.id}:line-${lineIndex + 1}`,
      ...line,
      ...matchLine(line, input.foods ?? []),
    }));
    const applied = status === "APPLIED";
    return [{
      id: `demo-warehouse-bot:${day}:${slot}:${sample.id}`,
      slot,
      sample,
      scheduledAt: scheduled.toISOString(),
      processedAt: new Date(scheduled.getTime() + 15 * 60_000).toISOString(),
      status,
      applied,
      lines,
      stockReceipt: applied ? {
        id: `demo-stock-in:${day}:${slot}:${sample.id}`,
        type: "IN" as const,
        lineCount: lines.length,
        totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
        totalValue: lines.reduce((sum, line) => sum + line.total, 0),
      } : null,
    }];
  });
}

export function demoWarehouseAppliedTotals(events: DemoWarehouseBotEvent[]) {
  const seen = new Set<string>();
  return events.reduce((totals, event) => {
    if (!event.stockReceipt || seen.has(event.stockReceipt.id)) return totals;
    seen.add(event.stockReceipt.id);
    return {
      receipts: totals.receipts + 1,
      lineCount: totals.lineCount + event.stockReceipt.lineCount,
      totalQuantity: totals.totalQuantity + event.stockReceipt.totalQuantity,
      totalValue: totals.totalValue + event.stockReceipt.totalValue,
    };
  }, { receipts: 0, lineCount: 0, totalQuantity: 0, totalValue: 0 });
}

export function demoWarehouseStockBalances(events: DemoWarehouseBotEvent[]) {
  const seenReceipts = new Set<string>();
  const balances = new Map<string, { foodId: string | null; itemName: string; quantity: number; unit: string; value: number }>();
  for (const event of events) {
    if (!event.stockReceipt || seenReceipts.has(event.stockReceipt.id)) continue;
    seenReceipts.add(event.stockReceipt.id);
    for (const line of event.lines) {
      const key = `${line.matchedFoodId ?? normalizeWarehouseBotText(line.originalLabel)}|${line.unit}`;
      const current = balances.get(key) ?? { foodId: line.matchedFoodId, itemName: line.matchedFoodName ?? line.originalLabel, quantity: 0, unit: line.unit, value: 0 };
      current.quantity += line.quantity;
      current.value += line.total;
      balances.set(key, current);
    }
  }
  return [...balances.values()].sort((left, right) => left.itemName.localeCompare(right.itemName));
}
