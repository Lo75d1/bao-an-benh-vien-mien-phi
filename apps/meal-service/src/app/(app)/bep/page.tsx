import { ChefHat } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CurrentMealLifecycle } from "@/components/current-meal-lifecycle";
import { EmptyState } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { readApprovedKitchenNotes } from "@/lib/kitchen";
import { lockExpiredMealEvent, servingTotal } from "@/lib/late-addition";
import { hospitalDayKey, mealTimePhase } from "@/lib/meal-events";
import { formatMass } from "@/lib/presentation";
import { readRequestClock } from "@/lib/request-clock";
import { mealOverrideForClock } from "@/lib/demo-meal-context";
import { KitchenBoard } from "./kitchen-board";
import { KitchenDialogs } from "./kitchen-dialogs";
import { KitchenHeaderStatus } from "./kitchen-header-status";
import { LivePhaseRefresh } from "@/components/live-phase-refresh";
import { readKitchenWorkspace } from "./workspace-data";
import { PhaseTransitionNotice } from "@/components/phase-transition-notice";
import { materializeServingCutoffSnapshot } from "@/lib/serving-report";
import { VoiceNotificationControl } from "@/components/voice-notification-control";
import { getTranslations } from "@/lib/locale";
import { readLocale } from "@/lib/locale-server";

type SnapshotItem = { itemName?: unknown; dishName?: unknown; grams?: unknown };
function menuItems(value: unknown, defaultDish: string) {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return [];
  return (value.items as SnapshotItem[]).flatMap((item) => typeof item.itemName === "string" && item.itemName.trim() ? [{ name: item.itemName.trim(), dishName: typeof item.dishName === "string" && item.dishName.trim() ? item.dishName.trim() : defaultDish, grams: typeof item.grams === "number" && Number.isFinite(item.grams) ? item.grams : null }] : []);
}

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ updated?: string; storage?: string; meal?: string; demoNow?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "KITCHEN") redirect("/");
  const query = await searchParams;
  const locale = await readLocale();
  const t = getTranslations(locale).management.kitchenPage;
  const clock = await readRequestClock(query.demoNow);
  const retentionLabel = (uploadedAt: Date, now = new Date()) => {
    const remainingMinutes = Math.max(0, Math.ceil((uploadedAt.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 60_000));
    if (!remainingMinutes) return t.retentionComplete;
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    const time = [
      hours ? t.retentionHours.replace("{count}", String(hours)) : null,
      minutes ? t.retentionMinutes.replace("{count}", String(minutes)) : null,
    ].filter(Boolean).join(" ");
    return t.retentionRemaining.replace("{time}", time);
  };
  const kitchenRoute = user.kitchenRoute ?? "NORMAL";
  let [workspace, notes] = await Promise.all([readKitchenWorkspace(mealOverrideForClock(query.meal, clock.simulated), kitchenRoute, clock.now, t.wholeMeal, retentionLabel), readApprovedKitchenNotes()]);
  if (!clock.simulated && workspace.selected && await materializeServingCutoffSnapshot(workspace.selected.id, user, clock.now)) workspace = await readKitchenWorkspace(query.meal, kitchenRoute, clock.now, t.wholeMeal, retentionLabel);
  if (!clock.simulated && workspace.selected && await lockExpiredMealEvent(workspace.selected.id, user, clock.now, kitchenRoute) > 0) workspace = await readKitchenWorkspace(query.meal, kitchenRoute, clock.now, t.wholeMeal, retentionLabel);
  const meal = workspace.selected;
  const hasActionableWork = workspace.hasActionableWork;
  const routeSummary = meal ? (["NORMAL", "SONDE"] as const).flatMap((route) => { const routeMeals = meal.dietMeals.filter((item) => item.feedingRoute === route); if (!routeMeals.length) return []; const hasData = routeMeals.some((item) => item.servingsPlanned > 0); const total = routeMeals.reduce((sum, item) => { const additions = meal.additions.filter((addition) => addition.dietTypeId === item.dietTypeId && addition.ackStatus === "RECEIVED"); return sum + servingTotal(item.servingsPlanned, additions).total; }, 0); return [t.routeSummary.replace("{route}", route === "SONDE" ? t.tubeRoute : t.oralRoute).replace("{value}", hasData ? t.servingCount.replace("{count}", String(total)) : "—")]; }).join(" · ") : "";
  const updateMessage = query.updated === "prepared" ? t.preparedMessage : query.updated === "reopened" ? t.reopenedMessage : t.processedMessage;

  const tools = meal && hasActionableWork ? <KitchenDialogs eventId={meal.id} canOperate={workspace.canOperate} additions={meal.additions} evidence={meal.evidence} dietMeals={meal.dietMeals.map((item) => ({ id: item.id, name: `${item.dietType.code} · ${item.dietType.name}` }))} patientNotes={notes.map((note) => ({ id: note.id, note: note.note, departmentName: note.department.name, mealDateLabel: hospitalDayKey(note.mealDate), acknowledged: note.acknowledged, attachmentPath: note.attachmentPath }))}/> : null;
  const serviceAt = meal ? `${hospitalDayKey(meal.mealDate)}T${meal.mealType.serviceTime}:00+07:00` : null;
  const phase = meal ? mealTimePhase(meal.mealDate, meal.mealType.cutoffTime, meal.mealType.serviceTime, clock.now) : null;
  const pendingAdditions = meal?.additions.filter((item) => item.ackStatus === "PENDING").length ?? 0;
  const unreadNotes = notes.filter((note) => !note.acknowledged).length;
  const notifications = [...(pendingAdditions ? [{ id: "pending-additions", label: t.pendingAdditionsLabel.replace("{count}", String(pendingAdditions)), detail: t.pendingAdditionsDetail }] : []), ...(unreadNotes ? [{ id: "unread-notes", label: t.unreadNotesLabel.replace("{count}", String(unreadNotes)), detail: t.unreadNotesDetail }] : [])];
  const voiceEvents = [
    ...(meal && hasActionableWork && phase === "PREPARING" ? [{ key: `phase:${hospitalDayKey(meal.mealDate)}:${meal.id}:${kitchenRoute}:PREPARING`, message: t.preparingVoice, announceOnEnable: true }] : []),
    ...(meal?.additions.filter((item) => item.ackStatus === "PENDING").map((item) => ({ key: `addition:${hospitalDayKey(meal.mealDate)}:${meal.id}:${kitchenRoute}:${item.id}`, message: t.additionVoice })) ?? []),
  ];
  const voiceControl = <VoiceNotificationControl workspace="kitchen" scope={kitchenRoute} events={voiceEvents}/>;

  return <AppShell user={user} adminNotifications={notifications} demoClock={clock.enabled ? { nowIso: clock.now.toISOString(), simulated: clock.simulated } : undefined} workflowStatus={<div className="workspace-voice-status">{serviceAt ? <KitchenHeaderStatus serviceAt={serviceAt} initialNowIso={clock.now.toISOString()} liveClock={!clock.simulated}/> : null}{voiceControl}</div>}><main className="kitchen-page kitchen-v2">
    <LivePhaseRefresh enabled={!clock.simulated}/>
    {meal && phase ? <PhaseTransitionNotice scope={`kitchen:${kitchenRoute}`} mealName={meal.mealType.name} phase={phase}/> : null}
    <CurrentMealLifecycle role={user.role} selectedMealId={meal?.id} now={clock.now} liveClock={!clock.simulated}/>
    {query.updated && <p className="success-banner" role="status">{updateMessage}</p>}
    {query.storage === "unavailable" && <p className="storage-notice" role="alert">{t.storageUnavailable}</p>}
    {!meal || !hasActionableWork ? <EmptyState icon={ChefHat} title={t.emptyTitle} description={t.emptyDescription}/> : <>
      <KitchenBoard eventId={meal.id} mealName={`${meal.mealType.name}${routeSummary ? ` · ${routeSummary}` : ""}`} canOperate={workspace.canOperate} tools={tools} meals={meal.dietMeals.map((item) => {
        const additions = meal.additions.filter((addition) => addition.dietTypeId === item.dietTypeId && addition.ackStatus === "RECEIVED");
        const totals = servingTotal(item.servingsPlanned, additions);
        const departmentIds = new Set([...meal.reports.filter((report) => report.lines.some((line) => line.dietTypeId === item.dietTypeId)).map((report) => report.departmentId), ...additions.map((addition) => addition.departmentId)]);
        const departments = [...departmentIds].map((departmentId) => { const report = meal.reports.find((value) => value.departmentId === departmentId); const original = report?.lines.find((line) => line.dietTypeId === item.dietTypeId)?.quantity ?? null; const extra = additions.filter((addition) => addition.departmentId === departmentId).reduce((sum, addition) => sum + addition.quantity, 0); return { id: departmentId, name: report?.department.name ?? additions.find((addition) => addition.departmentId === departmentId)?.department.name ?? "—", original, additions: extra || null, total: original === null && !extra ? null : (original ?? 0) + extra }; });
        const photo = item.evidence.find((value) => value.kind === "MEAL_PHOTO");
        return { id: item.id, code: item.dietType.code, name: `${item.dietType.name} · ${item.feedingRoute === "SONDE" ? t.tubeRoute : t.oralRoute}`, planned: item.servingsPlanned > 0 ? item.servingsPlanned : null, additions: totals.additions > 0 ? totals.additions : null, total: item.servingsPlanned > 0 ? totals.total : null, items: menuItems(item.menuSnapshotJson, t.defaultDish), status: item.status, departments, evidence: photo?.publicUrl ? { publicUrl: photo.publicUrl, note: photo.note, uploadedAt: photo.uploadedAt.toISOString() } : null };
      })} shopping={meal.shopping.items.map((item) => ({ foodId: item.foodId, foodName: item.foodName, edible: formatMass(item.edibleGrams), waste: item.wastePercent === null ? "—" : `${item.wastePercent}%`, raw: formatMass(item.rawGrams) }))} foodRetention24hRequired={workspace.foodRetention24hRequired} retentionEvidence={(() => { const evidence = meal.evidence.find((item) => item.kind === "FOOD_SAMPLE" && item.publicUrl); return evidence?.publicUrl ? { publicUrl: evidence.publicUrl, note: evidence.note, uploadedAt: evidence.uploadedAt.toISOString() } : null; })()} reportedDepartmentCount={meal.reports.length} deliveryReceiptCount={meal.deliveryReceipts.length} handoffs={meal.handoffs}/>
    </>}
  </main></AppShell>;
}
