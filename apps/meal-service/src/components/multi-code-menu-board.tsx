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

function dishesOf(meal: Meal) {
  return [...new Set(meal.items.map((item) => item.dishName))];
}

export function MultiCodeMenuBoard({ meals, warehouseNotes }: { meals: Meal[]; warehouseNotes: WarehouseNote[] }) {
  const [scope, setScope] = useState("all");
  const [openShopping, setOpenShopping] = useState(false);
  const shopping = useMemo(() => {
    const rows = new Map<string, { grams: number; missing: boolean; codes: Set<string> }>();
    for (const meal of meals) {
      if (scope !== "all" && scope !== meal.id) continue;
      for (const item of meal.items) {
        const row = rows.get(item.itemName) ?? { grams: 0, missing: false, codes: new Set<string>() };
        const grams = buyAmount(item, meal.servings);
        if (grams === null) row.missing = true; else row.grams += grams;
        row.codes.add(meal.code);
        rows.set(item.itemName, row);
      }
    }
    return [...rows.entries()].map(([name, row]) => ({ name, ...row })).sort((a, b) => b.grams - a.grams);
  }, [meals, scope]);
  const totalServings = meals.reduce((sum, meal) => sum + meal.servings, 0);
  const plannedCodes = meals.filter((meal) => meal.items.length > 0).length;

  return <section className="multi-ration-board" aria-label="Lập thực đơn nhiều mã">
    <header className="multi-ration-toolbar">
      <div><strong>🍽️ Thực đơn nhiều mã</strong><span>Mỗi mã là một khẩu phần độc lập để bếp gom nguyên liệu và đi chợ.</span></div>
      <div className="multi-ration-total"><span>{meals.length} mã</span><b>{plannedCodes}/{meals.length} đã lên thực đơn</b><em>{totalServings > 0 ? `${number.format(totalServings)} suất` : "— suất"}</em></div>
    </header>

    <div className="multi-ration-codes">
      {meals.map((meal, index) => {
        const dishes = dishesOf(meal);
        return <article className="ration-code-day" key={meal.id}>
          <header>
            <span className="ration-drag" aria-hidden="true">⠿</span>
            <div className="ration-code-name"><strong>{meal.code}</strong><small>Mã {index + 1}</small></div>
            <span className="ration-serving-count">{meal.servings > 0 ? `${number.format(meal.servings)} suất` : "— suất"}</span>
            <div className="ration-code-tools"><Link href={`/thuc-don?mode=single&meal=${meal.id}`}><Info size={15}/> Khuyến nghị</Link><Link href={`/thuc-don?mode=single&meal=${meal.id}`}>Mở mã ↗</Link></div>
          </header>
          {dishes.length > 0 ? <div className="ration-code-meals">
            <section className="ration-meal-card">
              <div className="ration-meal-grip" aria-hidden="true">⠿</div>
              <div className="ration-meal-body"><div className="ration-meal-heading"><strong>Khẩu phần</strong><span>{meal.items.length} thực phẩm</span></div>
                <div className="ration-dish-grid">{dishes.map((dish) => <div className="ration-dish-line" key={dish}><strong>🍽️ {dish}</strong><ul>{meal.items.filter((item) => item.dishName === dish).map((item, itemIndex) => <li key={`${item.itemName}-${itemIndex}`}><span>{item.itemName}</span><b>{number.format(item.grams)} g</b></li>)}</ul></div>)}</div>
              </div>
            </section>
            <Link className="ration-add-meal" href={`/thuc-don?mode=single&meal=${meal.id}`}>＋ món</Link>
          </div> : <div className="ration-code-empty"><span>Mã này chưa có món.</span><Link href={`/thuc-don?mode=single&meal=${meal.id}`}>＋ Lên thực đơn</Link></div>}
        </article>;
      })}
    </div>

    <div className="multi-ration-bottom">
      <div><strong>Chọn mã để nhập</strong><span>Thêm món, thực phẩm, nhập tay và AI trong workspace Một mã.</span></div>
      <select aria-label="Chọn mã để nhập" defaultValue="" onChange={(event) => { if (event.target.value) window.location.href = `/thuc-don?mode=single&meal=${event.target.value}`; }}><option value="">Chọn mã ăn…</option>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.code} · {meal.servings > 0 ? `${meal.servings} suất` : "chưa có số suất"}</option>)}</select>
      <button type="button" onClick={() => setOpenShopping((value) => !value)}><ShoppingBasket size={17}/> Tổng hợp đi chợ</button>
    </div>

    {openShopping && <section className="multi-shopping-panel">
      <header><div><ShoppingBasket size={20}/><span><strong>Tổng hợp đi chợ</strong><small>Không trừ số liệu kho theo dõi.</small></span></div><select value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">Toàn bộ mã</option>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.code}</option>)}</select></header>
      {shopping.length > 0 ? <div className="multi-shopping-table"><div><b>Nguyên liệu</b><b>Mã dùng</b><b>Lượng mua</b></div>{shopping.map((item) => <div key={item.name}><strong>{item.name}</strong><span>{[...item.codes].join(", ")}</span><b>{item.missing ? "—" : item.grams >= 1000 ? `${number.format(item.grams / 1000)} kg` : `${number.format(item.grams)} g`}</b></div>)}</div> : <div className="multi-shopping-empty"><ShoppingBasket size={24}/><strong>Chưa tính được nguyên liệu</strong><span>Cần có thực đơn và số suất của ít nhất một mã.</span></div>}
      <details className="warehouse-peek"><summary><PackageOpen size={17}/> Kho theo dõi · {warehouseNotes.length || "—"} ghi chép</summary>{warehouseNotes.length ? warehouseNotes.map((entry) => <div key={entry.id}><ClipboardList size={15}/><span><strong>{entry.type} · {entry.itemCount} mặt hàng</strong><small>{entry.occurredAt} · {entry.note || "Không có ghi chú"}</small></span></div>) : <p>Chưa có ghi chép kho.</p>}</details>
    </section>}
  </section>;
}
