"use client";

import type { DietMealStatus } from "@prisma/client";
import { ArrowLeft, BookOpen, ChefHat, ShoppingBasket } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { getMealBusinessFacts } from "@/lib/meal-state";
import { KitchenCompletionDialog } from "./kitchen-completion-dialog";

type MenuItem = { name: string; dishName: string; grams: number | null };
type DepartmentServing = { id: string; name: string; original: number | null; additions: number | null; total: number | null };
type Meal = { id: string; code: string; name: string; planned: number | null; additions: number | null; total: number | null; items: MenuItem[]; status: DietMealStatus; departments: DepartmentServing[] };
type Shopping = { foodId: string; foodName: string; edible: string; waste: string; raw: string };

export function KitchenBoard({ eventId, mealName, meals, shopping, tools, canOperate, foodRetention24hRequired }: { eventId: string; mealName: string; meals: Meal[]; shopping: Shopping[]; tools: ReactNode; canOperate: boolean; foodRetention24hRequired: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const active = meals.find((meal) => meal.id === selected) ?? null;
  const prepared = getMealBusinessFacts({ dietStatuses: meals.map((meal) => meal.status) }).kitchen === "PREPARED";
  const total = useMemo(() => meals.some((meal) => meal.total !== null) ? meals.reduce((sum, meal) => sum + (meal.total ?? 0), 0) : null, [meals]);
  return <div className="kitchen-operation-grid">
    <section className="kitchen-operation-main"><header><div><span><ChefHat/> Số suất & tiến độ</span><h2>{mealName}</h2></div><div className="kitchen-board-tools">{tools}</div><b>{total === null ? "—" : `${total} suất`}</b></header>
      <div className="kitchen-operation-scroll"><table><thead><tr><th>Chế độ ăn</th><th>Thực đơn · khối lượng mỗi suất</th><th>Suất báo</th><th>Bổ sung</th><th>Tổng</th></tr></thead><tbody>{meals.map((meal) => <tr key={meal.id} onClick={() => setSelected(meal.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelected(meal.id); }}><th><button type="button"><BookOpen/><span><b translate="no">{meal.code}</b><small>{meal.name}</small></span></button></th><td>{meal.items.length ? [...new Set(meal.items.map((item) => item.dishName))].map((dish) => <div className="kitchen-dish-line" key={dish}><strong>{dish}</strong><small>{meal.items.filter((item) => item.dishName === dish).map((item) => `${item.name} ${item.grams === null ? "—" : `${item.grams} g`}`).join(" · ")}</small></div>) : "— · Chưa có thực đơn duyệt"}</td><td>{meal.planned ?? "—"}</td><td>{meal.additions ? `+${meal.additions}` : "—"}</td><td><b>{meal.total ?? "—"}</b></td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Tổng suất toàn bữa</th><td>{meals.some((meal) => meal.planned !== null) ? meals.reduce((sum, meal) => sum + (meal.planned ?? 0), 0) : "—"}</td><td>{meals.some((meal) => meal.additions) ? `+${meals.reduce((sum, meal) => sum + (meal.additions ?? 0), 0)}` : "—"}</td><td>{total ?? "—"}</td></tr></tfoot></table></div>
      <footer><KitchenCompletionDialog eventId={eventId} meals={meals.map(({ id, code, name }) => ({ id, code, name }))} prepared={prepared} canOperate={canOperate} foodRetention24hRequired={foodRetention24hRequired}/></footer>
    </section>
    <aside className="kitchen-operation-side">{active ? <><header><button type="button" onClick={() => setSelected(null)} aria-label="Trở lại danh sách đi chợ"><ArrowLeft/></button><div><span>Chi tiết mã</span><h2 translate="no">{active.code}</h2><small>{active.name}</small></div></header><div className="kitchen-side-scroll"><h3>Thực đơn và định lượng</h3>{active.items.length ? [...new Set(active.items.map((item) => item.dishName))].map((dish) => <article key={dish}><strong>{dish}</strong>{active.items.filter((item) => item.dishName === dish).map((item, index) => <p key={`${item.name}-${index}`}><span>{item.name}</span><b>{item.grams === null ? "—" : `${item.grams} g/suất`}</b></p>)}</article>) : <p>— · Chưa có dữ liệu thực đơn.</p>}<h3>Suất theo khoa</h3><div className="kitchen-department-table"><table><thead><tr><th>Khoa</th><th>Suất báo</th><th>Bổ sung</th><th>Tổng</th></tr></thead><tbody>{active.departments.length ? active.departments.map((department) => <tr key={department.id}><th>{department.name}</th><td>{department.original ?? "—"}</td><td>{department.additions ? `+${department.additions}` : "—"}</td><td><b>{department.total ?? "—"}</b></td></tr>) : <tr><td colSpan={4}>— · Chưa có khoa báo suất cho mã này.</td></tr>}</tbody></table></div></div></> : <><header><ShoppingBasket/><div><span>Đi chợ dự kiến</span><h2>Thực phẩm cần dùng</h2></div></header><div className="kitchen-side-scroll kitchen-shopping-table"><table><thead><tr><th>Thực phẩm</th><th>Ăn được</th><th>Thải bỏ</th><th>Cần mua</th></tr></thead><tbody>{shopping.length ? shopping.map((item) => <tr key={item.foodId}><th>{item.foodName}</th><td>{item.edible}</td><td>{item.waste}</td><td><b>{item.raw}</b></td></tr>) : <tr><td colSpan={4}>— · Chưa đủ dữ liệu để tính.</td></tr>}</tbody></table></div></>}</aside>
  </div>;
}
