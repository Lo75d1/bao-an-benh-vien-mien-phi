"use client";

import type { DietMealStatus } from "@prisma/client";
import { ArrowLeft, BookOpen, CheckCircle2, ChefHat, Circle, ShoppingBasket } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { getTranslations, readClientLocale } from "@/lib/locale";
import { getMealBusinessFacts } from "@/lib/meal-state";
import { FoodRetentionControl, KitchenCompletionDialog } from "./kitchen-completion-dialog";
import { KitchenHandoffControl } from "./kitchen-handoff-control";

type MenuItem = { name: string; dishName: string; grams: number | null };
type DepartmentServing = { id: string; name: string; original: number | null; additions: number | null; total: number | null };
type Evidence = { publicUrl: string; note: string | null; uploadedAt: string; demoBot?: boolean } | null;
type Meal = { id: string; code: string; name: string; planned: number | null; additions: number | null; total: number | null; items: MenuItem[]; status: DietMealStatus; departments: DepartmentServing[]; evidence: Evidence };
type Shopping = { foodId: string; foodName: string; edible: string; waste: string; raw: string };
type HandoffRow = { departmentId: string; departmentName: string; quantity: number; handedOffAt: string | null; handedOffBy: string | null };

export function KitchenBoard({ eventId, mealName, meals, shopping, tools, canOperate, foodRetention24hRequired, retentionEvidence, reportedDepartmentCount, deliveryReceiptCount, handoffs }: { eventId: string; mealName: string; meals: Meal[]; shopping: Shopping[]; tools: ReactNode; canOperate: boolean; foodRetention24hRequired: boolean; retentionEvidence: Evidence; reportedDepartmentCount: number; deliveryReceiptCount: number; handoffs: HandoffRow[] }) {
  const t = getTranslations(readClientLocale()).management.kitchenBoard;
  const [selected, setSelected] = useState<string | null>(null);
  const active = meals.find((meal) => meal.id === selected) ?? null;
  const prepared = getMealBusinessFacts({ dietStatuses: meals.map((meal) => meal.status) }).kitchen === "PREPARED";
  const total = useMemo(() => meals.some((meal) => meal.total !== null) ? meals.reduce((sum, meal) => sum + (meal.total ?? 0), 0) : null, [meals]);
  const totalLabel = total === null ? "-" : t.totalServingCount.replace("{count}", String(total));

  return <div className="kitchen-operation-grid">
    <section className="kitchen-operation-main">
      <header><div><span><ChefHat/> {t.mainTitle}</span><h2>{mealName}</h2></div><div className="kitchen-board-tools">{tools}</div><b>{totalLabel}</b></header>
      <div className="kitchen-operation-scroll">
        <table>
          <thead><tr><th>{t.dietHeader}</th><th>{t.menuHeader}</th><th>{t.plannedHeader}</th><th>{t.additionsHeader}</th><th>{t.totalHeader}</th></tr></thead>
          <tbody>{meals.map((meal) => <tr key={meal.id} onClick={() => setSelected(meal.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelected(meal.id); }}>
            <th><button type="button"><BookOpen/><span><b translate="no">{meal.code}</b><small>{meal.name}</small></span></button></th>
            <td>{meal.items.length ? [...new Set(meal.items.map((item) => item.dishName))].map((dish) => <div className="kitchen-dish-line" key={dish}><strong>{dish}</strong><small>{meal.items.filter((item) => item.dishName === dish).map((item) => `${item.name} ${item.grams === null ? "-" : t.grams.replace("{grams}", String(item.grams))}`).join(" · ")}</small></div>) : t.noApprovedMenu}</td>
            <td>{meal.planned ?? "-"}</td><td>{meal.additions ? `+${meal.additions}` : "-"}</td><td><b>{meal.total ?? "-"}</b></td>
          </tr>)}</tbody>
          <tfoot><tr><th colSpan={2}>{t.mealTotal}</th><td>{meals.some((meal) => meal.planned !== null) ? meals.reduce((sum, meal) => sum + (meal.planned ?? 0), 0) : "-"}</td><td>{meals.some((meal) => meal.additions) ? `+${meals.reduce((sum, meal) => sum + (meal.additions ?? 0), 0)}` : "-"}</td><td>{total ?? "-"}</td></tr></tfoot>
        </table>
      </div>
      <footer className="kitchen-workflow">
        <div className="kitchen-checklist">
          <span className="done"><CheckCircle2/> {t.receivedServings}</span>
          <span className={meals.every((meal) => meal.evidence) ? "done" : "current"}>{meals.every((meal) => meal.evidence) ? <CheckCircle2/> : <Circle/>} {t.mealPhotos.replace("{done}", String(meals.filter((meal) => meal.evidence).length)).replace("{total}", String(meals.length))}</span>
          <span className={prepared ? "done" : "current"}>{prepared ? <CheckCircle2/> : <Circle/>} {t.readyToHandoff}</span>
          <span className={reportedDepartmentCount > 0 && deliveryReceiptCount >= reportedDepartmentCount ? "done" : "pending"}><Circle/> {t.wardReceipt.replace("{done}", String(deliveryReceiptCount)).replace("{total}", reportedDepartmentCount ? String(reportedDepartmentCount) : "-")}</span>
          {foodRetention24hRequired ? <span className={retentionEvidence ? "done" : "pending"}>{retentionEvidence ? <CheckCircle2/> : <Circle/>} {t.retention24h}</span> : null}
        </div>
        <KitchenCompletionDialog eventId={eventId} meals={meals.map(({ id, code, name, evidence }) => ({ id, code, name, evidence }))} prepared={prepared} canOperate={canOperate}/>
        {prepared ? <KitchenHandoffControl eventId={eventId} rows={handoffs}/> : null}
        {foodRetention24hRequired ? <FoodRetentionControl eventId={eventId} evidence={retentionEvidence} canOperate={canOperate}/> : null}
      </footer>
    </section>
    <aside className="kitchen-operation-side">{active ? <>
      <header><button type="button" onClick={() => setSelected(null)} aria-label={t.backToShoppingList}><ArrowLeft/></button><div><span>{t.codeDetail}</span><h2 translate="no">{active.code}</h2><small>{active.name}</small></div></header>
      <div className="kitchen-side-scroll">
        <h3>{t.menuAndPortions}</h3>
        {active.items.length ? [...new Set(active.items.map((item) => item.dishName))].map((dish) => <article key={dish}><strong>{dish}</strong>{active.items.filter((item) => item.dishName === dish).map((item, index) => <p key={`${item.name}-${index}`}><span>{item.name}</span><b>{item.grams === null ? "-" : t.gramsPerServing.replace("{grams}", String(item.grams))}</b></p>)}</article>) : <p>{t.noMenuData}</p>}
        <h3>{t.wardServings}</h3>
        <div className="kitchen-department-table"><table><thead><tr><th>{t.wardHeader}</th><th>{t.plannedHeader}</th><th>{t.additionsHeader}</th><th>{t.totalHeader}</th></tr></thead><tbody>{active.departments.length ? active.departments.map((department) => <tr key={department.id}><th>{department.name}</th><td>{department.original ?? "-"}</td><td>{department.additions ? `+${department.additions}` : "-"}</td><td><b>{department.total ?? "-"}</b></td></tr>) : <tr><td colSpan={4}>{t.noWardReport}</td></tr>}</tbody></table></div>
      </div>
    </> : <>
      <header><ShoppingBasket/><div><span>{t.shoppingEyebrow}</span><h2>{t.shoppingTitle}</h2></div></header>
      <div className="kitchen-side-scroll kitchen-shopping-table"><table><thead><tr><th>{t.foodHeader}</th><th>{t.edibleHeader}</th><th>{t.wasteHeader}</th><th>{t.rawHeader}</th></tr></thead><tbody>{shopping.length ? shopping.map((item) => <tr key={item.foodId}><th>{item.foodName}</th><td>{item.edible}</td><td>{item.waste}</td><td><b>{item.raw}</b></td></tr>) : <tr><td colSpan={4}>{t.noShoppingData}</td></tr>}</tbody></table></div>
    </>}</aside>
  </div>;
}
