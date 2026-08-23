import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MenuEditor } from "@/components/menu-editor";
import { MultiCodeMenuBoard } from "@/components/multi-code-menu-board";
import { ContextMetrics, EmptyState, PageHeader } from "@/components/presentation";
import { Utensils } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { parseMenuItems } from "@/lib/menu-logic";
import { readRoleOverview } from "@/lib/overview";
import { prisma } from "@/lib/prisma";
import { entryWindowEnd, readOperationalSettings } from "@/lib/settings";
import {
  approveMenuAction,
  approveMenusAction,
  deleteTemplateAction,
  saveTemplateAction,
} from "./actions";
import { formatVnDay } from "@/lib/presentation";

function thresholdsOf(
  code: {
    energyKcalMin: number | null;
    energyKcalMax: number | null;
    proteinGMin: number | null;
    proteinGMax: number | null;
    lipidGMin: number | null;
    lipidGMax: number | null;
    glucidGMin: number | null;
    glucidGMax: number | null;
    sodiumMgMin: number | null;
    sodiumMgMax: number | null;
    potassiumMgMin: number | null;
    potassiumMgMax: number | null;
    waterGMin: number | null;
    waterGMax: number | null;
    mealsMin: number | null;
    mealsMax: number | null;
  } | null,
) {
  if (!code) return null;
  return {
    energyKcalMin: code.energyKcalMin,
    energyKcalMax: code.energyKcalMax,
    proteinGMin: code.proteinGMin,
    proteinGMax: code.proteinGMax,
    lipidGMin: code.lipidGMin,
    lipidGMax: code.lipidGMax,
    glucidGMin: code.glucidGMin,
    glucidGMax: code.glucidGMax,
    sodiumMgMin: code.sodiumMgMin,
    sodiumMgMax: code.sodiumMgMax,
    potassiumMgMin: code.potassiumMgMin,
    potassiumMgMax: code.potassiumMgMax,
    waterGMin: code.waterGMin,
    waterGMax: code.waterGMax,
    mealsMin: code.mealsMin,
    mealsMax: code.mealsMax,
  };
}

export const dynamic = "force-dynamic";
export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ meal?: string; saved?: string; mode?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "DIETITIAN") redirect("/");
  const params = await searchParams;
  const [settings, overview] = await Promise.all([readOperationalSettings(), readRoleOverview(user.role, user.id)]);
  const [meals, templates] = await Promise.all([
    prisma.dietMeal.findMany({
      where: {
        voidedAt: null,
        mealEvent: {
          mealDate: {
            lte: entryWindowEnd(new Date(), settings.advanceEntryDays),
          },
        },
        ...(settings.sondeEnabled ? {} : { feedingRoute: "NORMAL" }),
      },
      orderBy: [
        { mealEvent: { mealDate: "asc" } },
        { mealEvent: { mealType: { sortOrder: "asc" } } },
        { dietType: { sortOrder: "asc" } },
      ],
      include: {
        mealEvent: { include: { mealType: true } },
        dietType: { include: { dietCodeRef: true } },
      },
    }),
    prisma.menuTemplate.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        items: { orderBy: { id: "asc" } },
        _count: { select: { usedByMeals: true } },
      },
    }),
  ]);
  const selected = meals.find((meal) => meal.id === params.meal) ?? meals[0];
  const mode = params.mode === "multiple" ? "multiple" : "single";
  const relatedMeals = selected
    ? meals.filter(
        (meal) =>
          meal.mealEventId === selected.mealEventId &&
          meal.feedingRoute === selected.feedingRoute,
      )
    : [];
  const mealWorkItems = meals.filter(
    (meal, index) =>
      meals.findIndex(
        (candidate) =>
          candidate.mealEventId === meal.mealEventId &&
          candidate.feedingRoute === meal.feedingRoute,
      ) === index,
  );
  const relatedFoodIds = [
    ...new Set(
      relatedMeals.flatMap((meal) =>
        parseMenuItems(meal.menuSnapshotJson).flatMap((item) =>
          item.foodId ? [item.foodId] : [],
        ),
      ),
    ),
  ];
  const relatedFoods = relatedFoodIds.length
    ? await prisma.food.findMany({
        where: { id: { in: relatedFoodIds } },
        select: {
          id: true,
          energyKcal: true,
          proteinG: true,
          lipidG: true,
          glucidG: true,
          sodiumMg: true,
          potassiumMg: true,
          waterG: true,
        },
      })
    : [];
  const nutrientsByFood = new Map(
    relatedFoods.map((food) => [
      food.id,
      {
        energyKcal: food.energyKcal === null ? null : Number(food.energyKcal),
        proteinG: food.proteinG === null ? null : Number(food.proteinG),
        lipidG: food.lipidG === null ? null : Number(food.lipidG),
        glucidG: food.glucidG === null ? null : Number(food.glucidG),
        sodiumMg: food.sodiumMg === null ? null : Number(food.sodiumMg),
        potassiumMg:
          food.potassiumMg === null ? null : Number(food.potassiumMg),
        waterG: food.waterG === null ? null : Number(food.waterG),
      },
    ]),
  );
  const message =
    params.saved === "approved"
      ? "Đã duyệt thực đơn và đóng băng snapshot."
      : params.saved === "approved-batch"
        ? "Đã duyệt hàng loạt; mỗi mã có snapshot và nhật ký riêng."
        : params.saved === "template"
          ? "Đã lưu mẫu cá nhân."
          : params.saved === "deleted"
            ? "Đã xóa mẫu chưa sử dụng."
            : null;
  return (
    <AppShell user={user}>
      <main
        className={`workspace menu-page ${mode === "multiple" ? "multiple-workspace-page" : ""}`}
      ><Separator className="page-separator" aria-hidden="true"/>
        <PageHeader eyebrow="Bàn làm việc dinh dưỡng" title="Lập và duyệt thực đơn" description="Chọn một hoặc nhiều mã chế độ để lên thực đơn trong cùng một bàn làm việc."/>
        <ContextMetrics items={[{ label: "Ngày × chế độ chưa có thực đơn duyệt", value: overview.kind === "DIETITIAN" && overview.missingDateDietCount !== null ? `${overview.missingDateDietCount} mục` : "—" }]}/>
        {message && (
          <p className="success-banner" role="status">
            {message}
          </p>
        )}
        {meals.length === 0 || !selected ? (
          <EmptyState
            icon={Utensils}
            title="Chưa có bữa và chế độ ăn để lên thực đơn"
            description="Khởi tạo lịch tuần trước, sau đó quay lại màn này."
          />
        ) : (
          <>
            <div className="menu-workspace-top">
              <nav
                className="menu-mode-switch"
                aria-label="Chế độ lập thực đơn"
              >
                <a
                  className={mode === "single" ? "active" : ""}
                  href={`/thuc-don?mode=single&meal=${selected.id}`}
                >
                  Một mã
                </a>
                <a
                  className={mode === "multiple" ? "active" : ""}
                  href={`/thuc-don?mode=multiple&meal=${selected.id}`}
                >
                  Nhiều mã
                </a>
              </nav>
              <nav
                className="menu-wizard-workspace"
                aria-label="Các bước lập thực đơn"
              >
                <a
                  aria-current="step"
                  href={`/thuc-don?mode=${mode}&meal=${selected.id}`}
                >
                  ① Lập thực đơn
                </a>
                <span>▶</span>
                <a href="#analysis">② Phân tích &amp; báo cáo</a>
              </nav>
              {mode === "multiple" && <form className="multi-meal-picker-workspace" method="get"><input type="hidden" name="mode" value="multiple"/><label><span className="sr-only">Bữa đang xử lý</span><select name="meal" defaultValue={selected.id}>{mealWorkItems.map((meal) => <option key={meal.id} value={meal.id}>{formatVnDay(meal.mealEvent.mealDate)} · {meal.mealEvent.mealType.name} · {meal.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"}</option>)}</select></label><button>Chuyển việc</button></form>}
            </div>
            {mode === "single" && <form className="single-meal-picker-workspace" method="get"><input type="hidden" name="mode" value="single"/><label>Mã đang xử lý<select name="meal" defaultValue={selected.id}>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.approvedAt ? "✓" : "○"} {formatVnDay(meal.mealEvent.mealDate)} · {meal.mealEvent.mealType.name} · {meal.feedingRoute === "SONDE" ? "Sonde" : "Ăn thường"} · {meal.dietType.name} ({meal.dietType.code})</option>)}</select></label><button>Chuyển việc</button></form>}
            {mode === "single" ? (
              <MenuEditor
                dietMeal={{
                  id: selected.id,
                  dietTypeId: selected.dietTypeId,
                  feedingRoute: selected.feedingRoute,
                  approved: Boolean(selected.approvedAt),
                  existing: parseMenuItems(selected.menuSnapshotJson).map((item) => ({
                    ...item,
                    nutrients: item.foodId ? nutrientsByFood.get(item.foodId) : undefined,
                  })),
                }}
                context={{
                  date: formatVnDay(selected.mealEvent.mealDate),
                  mealName: selected.mealEvent.mealType.name,
                  dietCode: selected.dietType.code,
                  dietName: selected.dietType.name,
                  servings: selected.servingsPlanned,
                }}
                thresholds={thresholdsOf(selected.dietType.dietCodeRef)}
                templates={templates.map((template) => ({
                  id: template.id,
                  label: template.name,
                  items: template.items.map((item) => ({
                    foodId: item.foodId,
                    itemName: item.itemName,
                    grams: Number(item.grams),
                    wastePercent:
                      item.wastePercent === null
                        ? null
                        : Number(item.wastePercent),
                  })),
                }))}
                copies={meals
                  .filter(
                    (meal) =>
                      meal.id !== selected.id && meal.menuSnapshotJson !== null,
                  )
                  .map((meal) => ({
                    id: meal.id,
                    label: `${formatVnDay(meal.mealEvent.mealDate)} · ${meal.mealEvent.mealType.name} · ${meal.dietType.name}`,
                    items: parseMenuItems(meal.menuSnapshotJson),
                  }))}
                approveAction={approveMenuAction}
                saveTemplateAction={saveTemplateAction}
              />
            ) : (
              <>
                <MultiCodeMenuBoard
                  context={{
                    eventId: selected.mealEventId,
                    date: formatVnDay(selected.mealEvent.mealDate),
                    mealName: selected.mealEvent.mealType.name,
                    feedingRoute: selected.feedingRoute,
                  }}
                  meals={relatedMeals.map((meal) => ({
                    id: meal.id,
                    dietTypeId: meal.dietTypeId,
                    code: meal.dietType.code,
                    name: meal.dietType.name,
                    servings: meal.servingsPlanned,
                    approved: Boolean(meal.approvedAt),
                    thresholds: thresholdsOf(meal.dietType.dietCodeRef),
                    items: parseMenuItems(meal.menuSnapshotJson).map(
                      (item) => ({
                        ...item,
                        nutrients: item.foodId
                          ? nutrientsByFood.get(item.foodId) ?? {
                              energyKcal: null,
                              proteinG: null,
                              lipidG: null,
                              glucidG: null,
                              sodiumMg: null,
                              potassiumMg: null,
                              waterG: null,
                            }
                          : {
                              energyKcal: null,
                              proteinG: null,
                              lipidG: null,
                              glucidG: null,
                              sodiumMg: null,
                              potassiumMg: null,
                              waterG: null,
                            },
                      }),
                    ),
                  }))}
                  approveAction={approveMenusAction}
                />
                <section id="analysis" className="analysis-workspace">
                  <p className="eyebrow">Bước ②</p>
                  <h2>Phân tích &amp; báo cáo</h2>
                  <p>
                    Chọn “Đánh giá mã” trong từng thẻ để xem đối chiếu dinh
                    dưỡng song song. Các báo cáo khẩu phần chi tiết tiếp tục
                    dùng dữ liệu của từng snapshot sau khi duyệt.
                  </p>
                </section>
              </>
            )}
            {mode === "single" && (
              <section className="template-library">
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">Kho mẫu cá nhân</p>
                    <h2>Mẫu của {user.displayName}</h2>
                  </div>
                  <span>{templates.length || "—"} mẫu</span>
                </div>
                {templates.length === 0 ? (
                  <p className="muted-copy">
                    Chưa có mẫu. Nhập thực đơn phía trên rồi chọn “Lưu làm mẫu”.
                  </p>
                ) : (
                  <div className="template-list">
                    {templates.map((template) => (
                      <div className="template-line" key={template.id}>
                        <div>
                          <strong>{template.name}</strong>
                          <span>
                            {template.items.length} thực phẩm ·{" "}
                            {template._count.usedByMeals
                              ? `đã dùng ${template._count.usedByMeals} lần`
                              : "chưa dùng"}
                          </span>
                        </div>
                        <form action={deleteTemplateAction}>
                          <input
                            type="hidden"
                            name="templateId"
                            value={template.id}
                          />
                          <button
                            className="remove-button"
                            disabled={template._count.usedByMeals > 0}
                            title={
                              template._count.usedByMeals
                                ? "Mẫu đã dùng không thể xóa"
                                : "Xóa mẫu"
                            }
                          >
                            Xóa
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
