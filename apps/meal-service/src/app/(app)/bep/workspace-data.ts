import { buildDietMealShopping, hasActionableKitchenWork } from "@/lib/kitchen";
import { hospitalDayKey, isKitchenPreparationOpen, pickOperationalMeal, rollupMealEventStatus } from "@/lib/meal-events";
import { servingTotal } from "@/lib/late-addition";
import { staffMealEvidenceUrl } from "@/lib/evidence-storage";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";
import { foodRetentionLabel } from "@/lib/food-retention";
import { readDemoSession } from "@/lib/demo-session";
import { deriveHandoffSnapshots } from "@/lib/meal-handoff";


const eventInclude = {
  mealType: true,
  additions: { orderBy: { submittedAt: "desc" as const }, include: { department: true, dietType: true } },
  reports: { where: { status: "SUBMITTED" as const }, select: { departmentId: true, department: { select: { name: true } }, lines: { select: { dietTypeId: true, quantity: true } } } },
  deliveryReceipts: { select: { departmentId: true, status: true } },
  mealHandoffs: { select: { departmentId: true, quantity: true, handedOffAt: true, department: { select: { name: true } }, handedOffBy: { select: { displayName: true } } } },
  evidence: { orderBy: { uploadedAt: "desc" as const } },
  dietMeals: {
    where: { voidedAt: null },
    orderBy: { dietType: { sortOrder: "asc" as const } },
    select: {
      id: true,
      dietTypeId: true,
      feedingRoute: true,
      menuSnapshotJson: true,
      patientVisibleNote: true,
      servingsPlanned: true,
      status: true,
      dietType: true,
      evidence: { orderBy: { uploadedAt: "desc" as const } },
    },
  },
} as const;

export async function readKitchenWorkspace(requestedMealId?: string, feedingRoute: "NORMAL" | "SONDE" = "NORMAL", now = new Date()) {
  const settings = await readOperationalSettings();
  const today = new Date(`${hospitalDayKey(now)}T00:00:00.000Z`);
  let events = await prisma.mealEvent.findMany({
    where: { mealDate: today, mealType: { feedingRoute } },
    orderBy: { mealType: { sortOrder: "asc" } },
    include: eventInclude,
  });

  if (events.length === 0) {
    const next = await prisma.mealEvent.findFirst({
      where: { mealDate: { gt: today }, mealType: { feedingRoute } },
      orderBy: [{ mealDate: "asc" }, { mealType: { sortOrder: "asc" } }],
      select: { mealDate: true },
    });
    if (next) {
      events = await prisma.mealEvent.findMany({
        where: { mealDate: next.mealDate, mealType: { feedingRoute } },
        orderBy: { mealType: { sortOrder: "asc" } },
        include: eventInclude,
      });
    }
  }

  events = events.map((event) => ({ ...event, dietMeals: event.dietMeals.filter((meal) => meal.feedingRoute === feedingRoute), additions: event.additions.filter((addition) => addition.dietType.feedingRoute === feedingRoute) }));
  const demo = await readDemoSession();
  if (demo) {
    const departmentIds = [...new Set(demo.state.reports.map((item) => item.departmentId))];
    const departmentNames = new Map((await prisma.department.findMany({ where: { id: { in: departmentIds } }, select: { id: true, name: true } })).map((item) => [item.id, item.name]));
    const demoAdditions = demo.state.additions.filter((item) => item.feedingRoute === feedingRoute);
    const [additionDepartments, additionDietTypes] = await Promise.all([
      prisma.department.findMany({ where: { id: { in: [...new Set(demoAdditions.map((item) => item.departmentId))] } } }),
      prisma.dietType.findMany({ where: { id: { in: [...new Set(demoAdditions.map((item) => item.dietTypeId))] } } }),
    ]);
    const departmentsById = new Map(additionDepartments.map((item) => [item.id, item]));
    const dietTypesById = new Map(additionDietTypes.map((item) => [item.id, item]));
    events = events.map((event) => {
      const reports = [...event.reports];
      for (const overlay of demo.state.reports.filter((item) => item.mealEventId === event.id)) {
        const report = { departmentId: overlay.departmentId, department: { name: departmentNames.get(overlay.departmentId) ?? "—" }, lines: overlay.lines.map((line) => ({ dietTypeId: line.dietTypeId, quantity: line.quantity })) };
        const current = reports.findIndex((item) => item.departmentId === overlay.departmentId);
        if (current >= 0) reports.splice(current, 1, report); else reports.push(report);
      }
      const additions = [...event.additions];
      for (const item of demoAdditions.filter((addition) => addition.mealEventId === event.id)) {
        const department = departmentsById.get(item.departmentId);
        const dietType = dietTypesById.get(item.dietTypeId);
        if (!department || !dietType) continue;
        additions.push({ ...item, submittedById: "demo", submittedAt: new Date(item.submittedAt), ackById: null, ackAt: null, department, dietType });
      }
      return { ...event, reports, additions, dietMeals: event.dietMeals.map((meal) => ({ ...meal, servingsPlanned: reports.reduce((sum, report) => sum + (report.lines.find((line) => line.dietTypeId === meal.dietTypeId)?.quantity ?? 0), 0), status: (demo.state.dietStatuses[meal.id] ?? meal.status) as typeof meal.status, evidence: [...demo.state.evidence.filter((item) => item.kind === "MEAL_PHOTO" && item.dietMealId === meal.id).map((item) => ({ id: `demo:${meal.id}`, dietMealId: meal.id, mealEventId: null, kind: "MEAL_PHOTO" as const, storagePath: item.storagePath, uploadedById: "demo", uploadedAt: new Date(item.uploadedAt), note: item.note })), ...meal.evidence] })), evidence: [...demo.state.evidence.filter((item) => item.kind === "FOOD_SAMPLE" && item.mealEventId === event.id).map((item) => ({ id: `demo:${event.id}:sample`, dietMealId: null, mealEventId: event.id, kind: "FOOD_SAMPLE" as const, storagePath: item.storagePath, uploadedById: "demo", uploadedAt: new Date(item.uploadedAt), note: item.note })), ...event.evidence] };
    });
  }
  const summaries = events.map((event) => ({
    id: event.id,
    name: event.mealType.name,
    serviceTime: event.mealType.serviceTime,
    status: rollupMealEventStatus(event.dietMeals.map((meal) => meal.status)) ?? "CANCELLED",
  }));
  const selected = pickOperationalMeal(events.map((event) => ({ ...event, cutoffTime: event.mealType.cutoffTime, serviceTime: event.mealType.serviceTime, status: rollupMealEventStatus(event.dietMeals.map((meal) => meal.status)) })), requestedMealId, now, settings.serviceCompletionMinutes);

  if (!selected) return { events: summaries, selected: null, canOperate: false, hasActionableWork: false, foodRetention24hRequired: settings.foodRetention24hRequired };
  const hasActionableWork = hasActionableKitchenWork({
    reportQuantities: [
      ...selected.dietMeals.map((meal) => meal.servingsPlanned),
      ...selected.reports.flatMap((report) => report.lines.map((line) => line.quantity)),
    ],
    additions: selected.additions.map((addition) => ({ quantity: addition.quantity, ackStatus: addition.ackStatus })),
  });
  const shopping = buildDietMealShopping(selected.dietMeals.map((meal) => ({
    id: meal.id,
    dietTypeId: meal.dietTypeId,
    dietName: meal.dietType.name,
    servingsPlanned: servingTotal(meal.servingsPlanned, selected.additions.filter((addition) => addition.dietTypeId === meal.dietTypeId && addition.ackStatus === "RECEIVED")).total,
    menuSnapshotJson: meal.menuSnapshotJson,
  })));
  const evidence = [...selected.dietMeals.flatMap((meal) => meal.evidence.map((item) => ({
    ...item,
    dietName: meal.dietType.name,
    publicUrl: item.storagePath ? staffMealEvidenceUrl(item.id) : null,
  }))), ...selected.evidence.map((item) => ({ ...item, dietName: `Toàn bữa · ${foodRetentionLabel(item.uploadedAt, now)}`, publicUrl: item.storagePath ? staffMealEvidenceUrl(item.id) : null }))];
  const prepared = selected.dietMeals.length > 0 && selected.dietMeals.every((meal) => meal.status === "PREPARED");
  const handoffReports = selected.reports.map((report) => ({ departmentId: report.departmentId, quantities: report.lines.map((line) => line.quantity) }));
  const handoffAdditions = selected.additions.filter((addition) => addition.ackStatus === "RECEIVED" || addition.ackStatus === "SUBSTITUTE").map((addition) => ({ departmentId: addition.departmentId, quantity: addition.quantity }));
  const handoffSnapshots = deriveHandoffSnapshots({ route: selected.mealType.feedingRoute, dietStatuses: prepared ? selected.dietMeals.map((meal) => meal.status) : [], reports: handoffReports, additions: handoffAdditions }, feedingRoute);
  const departmentNames = new Map([...selected.reports.map((report) => [report.departmentId, report.department.name] as const), ...selected.additions.map((addition) => [addition.departmentId, addition.department.name] as const)]);
  const existingHandoffs = new Map(selected.mealHandoffs.map((handoff) => [handoff.departmentId, handoff]));
  const handoffs = handoffSnapshots.map((snapshot) => { const existing = existingHandoffs.get(snapshot.departmentId); return { departmentId: snapshot.departmentId, departmentName: existing?.department.name ?? departmentNames.get(snapshot.departmentId) ?? "—", quantity: existing?.quantity ?? snapshot.quantity, handedOffAt: existing?.handedOffAt.toISOString() ?? null, handedOffBy: existing?.handedOffBy.displayName ?? null }; });
  return { events: summaries, selected: { ...selected, dietMeals: selected.dietMeals.map((meal) => ({ ...meal, evidence: meal.evidence.map((item) => ({ ...item, publicUrl: item.storagePath ? staffMealEvidenceUrl(item.id) : null })) })), shopping, evidence, handoffs }, canOperate: hasActionableWork && isKitchenPreparationOpen(selected.mealDate, selected.mealType.cutoffTime, selected.mealType.serviceTime, now, settings.serviceCompletionMinutes), hasActionableWork, foodRetention24hRequired: settings.foodRetention24hRequired };
}
