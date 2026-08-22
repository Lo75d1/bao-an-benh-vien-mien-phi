"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardList, Info, PackageOpen, ShoppingBasket } from "lucide-react";

type MenuRow = { itemName: string; dishName: string; grams: number; wastePercent: number | null };
type Meal = { id: string; code: string; servings: number; approved: boolean; items: MenuRow[] };
type WarehouseNote = { id: string; type: string; occurredAt: string; itemCount: number; note: string | null };
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

function buyAmount(item: MenuRow, servings: number) {
  if (servings <= 0 || item.wastePercent === null || item.wastePercent >= 100) return null;
  return item.grams * servings / (1 - item.wastePercent / 100);
}

export function MultiCodeMenuBoard({ meals, warehouseNotes }: { meals: Meal[]; warehouseNotes: WarehouseNote[] }) {
  const [panel, setPanel] = useState<"shopping" | "warehouse">("shopping");
  const [scope, setScope] = useState("all");
  const shopping = useMemo(() => {
    const rows = new Map<string, { grams: number; missing: boolean; codes: Set<string> }>();
    for (const meal of meals) {
      if (scope !== "all" && scope !== meal.id) continue;
      for (const item of meal.items) {
        const row = rows.get(item.itemName) ?? { grams: 0, missing: false, codes: new Set<string>() };
        const grams = buyAmount(item, meal.servings);
        if (grams === null) row.missing = true; else row.grams += grams;
        row.codes.add(meal.code); rows.set(item.itemName, row);
      }
    }
    return [...rows.entries()].map(([name, row]) => ({ name, ...row })).sort((a, b) => b.grams - a.grams);
  }, [meals, scope]);

  return <div className="multi-code-layout">
    <section className="diet-code-stack" aria-label="Các mã ăn trong bữa">{meals.map((meal) => {
      const dishes = [...new Set(meal.items.map((item) => item.dishName))];
      return <article className="diet-code-card" key={meal.id}><header><div className="diet-code-title"><strong>{meal.code}</strong><span>·</span><b>{meal.servings > 0 ? `${number.format(meal.servings)} suất` : "— suất"}</b><Link href={`/thuc-don?mode=single&meal=${meal.id}`} title="Xem chỉ tiêu của mã ăn"><Info size={15}/> Khuyến nghị</Link></div><div className="diet-code-state"><span className={meal.approved ? "approved" : "draft"}>{meal.approved ? "Đã duyệt" : "Chưa duyệt"}</span><Link href={`/thuc-don?mode=single&meal=${meal.id}`}>Mở mã →</Link></div></header>
        {dishes.length ? <div className="diet-dishes">{dishes.map((dish) => <div key={dish}><strong>{dish}</strong><ul>{meal.items.filter((item) => item.dishName === dish).map((item, index) => <li key={`${item.itemName}-${index}`}><span>{item.itemName}</span><em>{number.format(item.grams)} g/suất</em></li>)}</ul></div>)}</div> : <div className="code-empty"><span>Chưa có thực đơn cho mã này.</span><Link href={`/thuc-don?mode=single&meal=${meal.id}`}>Lên thực đơn</Link></div>}
      </article>;
    })}</section>
    <aside className="menu-side-panel"><div className="side-panel-tabs" role="tablist"><button type="button" className={panel === "shopping" ? "active" : ""} onClick={() => setPanel("shopping")}><ShoppingBasket size={17}/> Nguyên liệu cần mua</button><button type="button" className={panel === "warehouse" ? "active" : ""} onClick={() => setPanel("warehouse")}><PackageOpen size={17}/> Kho theo dõi</button></div>
      {panel === "shopping" ? <><div className="shopping-scope"><button type="button" className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>Toàn bữa</button><select aria-label="Xem theo mã" value={scope === "all" ? "" : scope} onChange={(event) => setScope(event.target.value || "all")}><option value="">Theo mã</option>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.code}</option>)}</select></div><div className="shopping-summary"><div><span>Mã ăn</span><strong>{scope === "all" ? meals.length : 1}</strong></div><div><span>Nguyên liệu</span><strong>{shopping.length || "—"}</strong></div><div><span>Tổng suất</span><strong>{number.format(scope === "all" ? meals.reduce((sum, meal) => sum + meal.servings, 0) : meals.find((meal) => meal.id === scope)?.servings ?? 0)}</strong></div></div>
        {shopping.length ? <div className="shopping-list"><div className="shopping-head"><span>Nguyên liệu</span><span>Mã dùng</span><span>Lượng mua</span></div>{shopping.map((item) => <div className="shopping-line" key={item.name}><strong>{item.name}</strong><small>{[...item.codes].join(", ")}</small><b>{item.missing ? "—" : item.grams >= 1000 ? `${number.format(item.grams / 1000)} kg` : `${number.format(item.grams)} g`}</b></div>)}</div> : <div className="side-empty"><ShoppingBasket size={24}/><strong>Chưa tính được nguyên liệu</strong><span>Cần có thực đơn và số suất của ít nhất một mã ăn.</span></div>}{shopping.some((item) => item.missing) && <p className="shopping-warning">Một số dòng hiển thị “—” vì thiếu số suất hoặc tỷ lệ thải bỏ.</p>}<p className="panel-footnote">Tính từ gram sạch mỗi suất × số suất, có điều chỉnh tỷ lệ thải bỏ. Không trừ kho.</p></> : <><div className="warehouse-note"><Info size={17}/><p><strong>Sổ theo dõi độc lập</strong><span>Số liệu kho chỉ để nhập và tra cứu, không làm thay đổi lượng cần mua.</span></p></div>{warehouseNotes.length ? <div className="warehouse-note-list">{warehouseNotes.map((entry) => <div key={entry.id}><span className="warehouse-type">{entry.type}</span><p><strong>{entry.itemCount} mặt hàng</strong><small>{entry.occurredAt}</small></p><em>{entry.note || "Không có ghi chú"}</em></div>)}</div> : <div className="side-empty"><ClipboardList size={24}/><strong>Chưa có ghi chép kho</strong><span>Nhập tại trang Kho để bắt đầu lưu sổ theo dõi.</span></div>}<Link className="warehouse-link" href="/kho">Mở trang Kho →</Link></>}
    </aside>
  </div>;
}
