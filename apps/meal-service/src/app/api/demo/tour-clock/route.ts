import { ensureDemoTourScenario, readDemoSession } from "@/lib/demo-session";
import {
  DEMO_TOUR_STAGE_COPY,
  demoTourRoute,
  demoTourStageInstant,
  isDemoTourStage,
} from "@/lib/demo-tour-clock";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";

const timeLabel = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
});

export async function GET(request: Request) {
  let session = await readDemoSession();
  if (!session)
    return Response.json({ error: "Phiên Demo đã hết hạn." }, { status: 401 });
  const stageValue = new URL(request.url).searchParams.get("stage");
  if (!isDemoTourStage(stageValue))
    return Response.json({ error: "Mốc hướng dẫn không hợp lệ." }, { status: 400 });

  const route = demoTourRoute(session.workspace);
  if (session.workspace === "NURSE" && !session.state.tourScenario[route]) {
    await ensureDemoTourScenario(session.workspace);
    session = await readDemoSession();
    if (!session)
      return Response.json({ error: "Phiên Demo đã hết hạn." }, { status: 401 });
  }
  const [settings, events] = await Promise.all([
    readOperationalSettings(),
    prisma.mealEvent.findMany({
      where: {
        mealType: { feedingRoute: route, status: "ACTIVE" },
      },
      orderBy: [{ mealDate: "desc" }],
      take: 40,
      select: {
        id: true,
        mealDate: true,
        dietMeals: {
          where: { voidedAt: null, feedingRoute: route },
          orderBy: { dietType: { sortOrder: "asc" } },
          take: 1,
          select: { id: true },
        },
        mealType: {
          select: {
            name: true,
            cutoffTime: true,
            serviceTime: true,
            sortOrder: true,
          },
        },
      },
    }),
  ]);
  const scenarioId = session.state.tourScenario[route]?.mealEventId;
  const latestDate = events[0]?.mealDate.getTime();
  const event = events.find((item) => item.id === scenarioId) ?? events
    .filter((item) => item.mealDate.getTime() === latestDate)
    .sort((a, b) => a.mealType.sortOrder - b.mealType.sortOrder)[0];
  if (!event)
    return Response.json(
      { error: `Chưa có ${route === "SONDE" ? "cữ Sonde" : "bữa ăn"} mẫu để chạy hướng dẫn.` },
      { status: 404 },
    );
  const target = demoTourStageInstant(
    event.mealDate,
    event.mealType.cutoffTime,
    event.mealType.serviceTime,
    stageValue,
    settings.serviceCompletionMinutes,
  );
  if (!target)
    return Response.json({ error: "Lịch giờ của bữa mẫu không hợp lệ." }, { status: 422 });
  const copy = DEMO_TOUR_STAGE_COPY[stageValue];
  return Response.json({
    nowIso: target.toISOString(),
    timeLabel: timeLabel.format(target),
    mealName: event.mealType.name,
    stage: stageValue,
    stageLabel: copy.label,
    responsibility: copy.responsibility,
    cutoffTime: event.mealType.cutoffTime,
    serviceTime: event.mealType.serviceTime,
    route,
    mealEventId: event.id,
    dietMealId: event.dietMeals[0]?.id ?? null,
    mealDate: event.mealDate.toISOString().slice(0, 10),
  });
}
