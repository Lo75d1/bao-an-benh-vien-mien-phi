"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ManagementMeal } from "@/lib/management";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";
import { formatMass } from "@/lib/presentation";

export function MealDetailDialog({ meal, date, stateLabel, trigger, canPlanMenu = false }: { meal: ManagementMeal; date: string; stateLabel: string; trigger: ReactNode; canPlanMenu?: boolean }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management.mealDetailDialog;
  const number = new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", { maximumFractionDigits: 1 });
  const dateTime = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hour12: false });
  const menuNames = [...new Set(meal.diets.flatMap((diet) => diet.menuItems.map((item) => item.dishName)))];
  const evidence = [
    ...meal.diets.flatMap((diet) => diet.evidence.map((item) => ({ ...item, dietCode: diet.code }))),
    ...meal.eventEvidence.map((item) => ({ ...item, dietCode: t.wholeMeal })),
  ];
  const missingDepartments = meal.departments.filter((department) => !department.reportId);
  const missingMenus = meal.diets.filter((diet) => !diet.approved || diet.menuItems.length === 0);
  const pendingAdditions = meal.additions.filter((item) => item.ackStatus === "PENDING");
  const hasMealPhoto = evidence.some((item) => item.kind === "MEAL_PHOTO");
  const hasFoodSample = evidence.some((item) => item.kind === "FOOD_SAMPLE");
  const hasWarnings = missingDepartments.length > 0 || missingMenus.length > 0 || pendingAdditions.length > 0 || !hasMealPhoto || (meal.foodRetention24hRequired && !hasFoodSample);
  const editableDiet = missingMenus[0] ?? meal.diets[0];
  const reportedDepartments = meal.departments.filter((department) => department.reportId);
  const departmentServingTotal = reportedDepartments.length > 0 && reportedDepartments.every((department) => department.totalServings !== null)
    ? reportedDepartments.reduce((sum, department) => sum + (department.totalServings ?? 0), 0)
    : null;

  return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="calendar-detail-dialog calendar-meal-detail-dialog overflow-y-auto"><DialogHeader><DialogTitle>{meal.name} · {date} · {stateLabel}</DialogTitle><DialogDescription>{t.description.replace("{cutoff}", meal.cutoffTime).replace("{service}", meal.serviceTime)}</DialogDescription></DialogHeader>
    <section className={hasWarnings ? "calendar-missing-summary warning" : "calendar-missing-summary ok"}>
      <div><h3>{hasWarnings ? t.warningTitle : t.readyTitle}</h3>{hasWarnings ? <ul>{missingDepartments.length ? <li>{t.missingDepartments.replace("{names}", missingDepartments.map((item) => item.name).join(", "))}</li> : null}{missingMenus.length ? <li>{t.missingMenus.replace("{codes}", missingMenus.map((item) => item.code).join(", "))}</li> : null}{pendingAdditions.length ? <li>{t.pendingAdditions.replace("{count}", String(pendingAdditions.length))}</li> : null}{!hasMealPhoto ? <li>{t.missingMealPhoto}</li> : null}{meal.foodRetention24hRequired && !hasFoodSample ? <li>{t.missingFoodSample}</li> : null}</ul> : <p>{t.noWarnings}</p>}</div>
      {canPlanMenu && stateLabel === t.notYet && editableDiet ? <Link className="button calendar-menu-action" href={`/thuc-don?meal=${encodeURIComponent(editableDiet.id)}`}>{missingMenus.length ? t.planMenu : t.editMenu}</Link> : null}
    </section>
    <div className="calendar-detail-grid">
      <section><h3>{t.dietSection}</h3>{meal.diets.length ? meal.diets.map((diet) => {
        const departmentLines = meal.departments.flatMap((department) => department.lines.filter((line) => line.dietCode === diet.code && line.quantity > 0).map((line) => ({ department: department.name, quantity: line.quantity })));
        return <article className="calendar-diet-detail" key={diet.id}><header><strong><span translate="no">{diet.code}</span> · {diet.name}</strong><span>{t.status[diet.status]}</span></header>
          <div className="calendar-diet-summary"><div><span>{t.totalServings}</span><strong>{diet.servings === null ? "-" : number.format(diet.servings)}</strong></div><div><span>{t.departmentsReportedCode}</span><strong>{departmentLines.length || "-"}</strong></div><div><span>{t.menu}</span><strong>{diet.approved ? t.locked : t.editable}</strong></div></div>
          <div className="calendar-diet-departments">{departmentLines.length ? departmentLines.map((line) => <span key={`${diet.id}-${line.department}`}>{line.department}<strong>{t.servingCount.replace("{count}", number.format(line.quantity))}</strong></span>) : <span>{t.noDepartmentForCode}</span>}</div>
          <p>{diet.menuItems.length ? [...new Set(diet.menuItems.map((item) => item.dishName))].join(", ") : t.noMenu}</p>
          {diet.menuItems.length ? <table><thead><tr><th scope="col">{t.dish}</th><th scope="col">{t.food}</th><th scope="col">{t.gramsPerServing}</th></tr></thead><tbody>{diet.menuItems.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.dishName}</td><td>{item.name}</td><td>{item.grams === null ? "-" : number.format(item.grams)}</td></tr>)}</tbody></table> : null}
          <div className="ops-criteria">{diet.criteria.length ? diet.criteria.map((criterion) => <span key={criterion.key}><strong>{criterion.label}</strong>{t.criterion[criterion.status]}</span>) : <span>{t.noEvaluation}</span>}</div>
          <dl className="calendar-people"><div><dt>{t.menuPlanner}</dt><dd>{diet.approvedBy ?? "-"}</dd></div><div><dt>{t.servingReporter}</dt><dd>{diet.reportedBy.length ? diet.reportedBy.join(", ") : "-"}</dd></div><div><dt>{t.kitchen}</dt><dd>{diet.kitchenLead ?? "-"}</dd></div></dl>
        </article>;
      }) : <p>{t.noDietCodes}</p>}</section>
      <aside><section><h3>{t.servingsByDepartment}</h3>{meal.departments.length ? <table className="calendar-department-summary"><thead><tr><th scope="col">{t.department}</th><th scope="col">{t.tableStatus}</th><th scope="col">{t.servings}</th></tr></thead><tbody>{meal.departments.map((department) => <tr key={department.id}><td>{department.name}</td><td className={department.reportId ? "ok" : "warning"}>{department.reportId ? t.reported : t.notReported}</td><td>{department.totalServings === null ? "-" : number.format(department.totalServings)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2} scope="row">{t.totalReported}</th><td>{departmentServingTotal === null ? "-" : number.format(departmentServingTotal)}</td></tr></tfoot></table> : <p>{t.noDepartmentsInScope}</p>}</section><section><h3>{t.additionsTitle}</h3>{meal.additions.length ? meal.additions.map((item) => <article className="calendar-addition" key={item.id}><strong>{t.additionServing.replace("{quantity}", String(item.quantity))} · <span translate="no">{item.dietCode}</span></strong><p>{item.reason}</p><small>{item.submittedBy} · {dateTime.format(new Date(item.submittedAt))}</small><b className={`addition-ack ack-${item.ackStatus.toLowerCase()}`}>{t.ack[item.ackStatus]}</b></article>) : <p>{t.noAdditions}</p>}</section><section><h3>{t.menuSummary}</h3><p>{menuNames.length ? menuNames.join(", ") : "-"}</p></section></aside>
    </div>
    <section className="calendar-evidence-section"><h3>{t.evidenceTitle}</h3>{evidence.length ? <div className="calendar-evidence-scroll"><table className="calendar-evidence-table"><thead><tr><th scope="col">{t.code}</th><th scope="col">{t.kind}</th><th scope="col">{t.photo}</th><th scope="col">{t.uploadedBy}</th><th scope="col">{t.time}</th><th scope="col">{t.note}</th></tr></thead><tbody>{evidence.map((item) => { const label = item.demoBot ? t.demoMealPhoto : t.evidence[item.kind]; return <tr key={item.id}><td><strong translate="no">{item.dietCode}</strong></td><td>{label}</td><td>{item.publicUrl ? <a href={item.publicUrl} target="_blank" rel="noreferrer" aria-label={t.viewEvidence.replace("{kind}", label).replace("{code}", item.dietCode)}><Image src={item.publicUrl} alt={label} width={96} height={64} unoptimized/></a> : "-"}</td><td>{item.uploadedBy}</td><td>{dateTime.format(new Date(item.uploadedAt))}</td><td>{item.demoBot ? <span className="demo-photo-pill">{t.demoMealPhotoNote}</span> : item.note ?? "-"}</td></tr>; })}</tbody></table></div> : <p>{t.noEvidence}</p>}</section>
  </DialogContent></Dialog>;
}

export type KitchenMenuItem = { dishName: string; name: string; grams: number | null; wastePercent: number | null; note: string | null };

export function KitchenMenuDetailDialog({ code, name, servings, items, notes, trigger }: { code: string; name: string; servings: number; items: KitchenMenuItem[]; notes: string[]; trigger: ReactNode }) {
  const locale = readClientLocale();
  const t = getTranslations(locale).management.mealDetailDialog;
  const number = new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", { maximumFractionDigits: 1 });
  const dishes = [...new Set(items.map((item) => item.dishName))];
  return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="calendar-detail-dialog max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle><span translate="no">{code}</span> · {name}</DialogTitle><DialogDescription>{servings > 0 ? t.kitchenDescription.replace("{count}", number.format(servings)) : t.noServings}</DialogDescription></DialogHeader>
    <section className="kitchen-menu-detail"><h3>{t.menu}</h3>{items.length ? <><p>{dishes.join(" · ")}</p><table><thead><tr><th scope="col">{t.dish}</th><th scope="col">{t.food}</th><th scope="col">{t.portionPerServing}</th><th scope="col">{t.totalToCook}</th><th scope="col">{t.note}</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.dishName}-${item.name}-${index}`}><td>{item.dishName}</td><td>{item.name}</td><td>{formatMass(item.grams)}</td><td>{item.grams === null || servings <= 0 ? "-" : formatMass(item.grams * servings)}</td><td>{item.note ?? (item.wastePercent === null ? <span className="warning">{t.missingWaste}</span> : t.wastePercent.replace("{percent}", number.format(item.wastePercent)))}</td></tr>)}</tbody></table></> : <p className="warning">{t.noApprovedMenu}</p>}</section>
    <section><h3>{t.approvedPatientNotes}</h3>{notes.length ? <ul>{notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ul> : <p>-</p>}</section>
  </DialogContent></Dialog>;
}
