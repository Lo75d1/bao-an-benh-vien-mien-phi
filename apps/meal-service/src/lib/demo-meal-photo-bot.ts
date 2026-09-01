import type { FeedingRoute } from "@prisma/client";

export const DEMO_MEAL_PHOTO_ASSETS = [
  "/demo/meal-samples/meal-01.jpg",
  "/demo/meal-samples/meal-02.jpg",
  "/demo/meal-samples/meal-03.jpg",
  "/demo/meal-samples/meal-04.jpg",
  "/demo/meal-samples/meal-05.jpg",
  "/demo/meal-samples/meal-06.jpg",
  "/demo/meal-samples/meal-07.jpg",
  "/demo/meal-samples/meal-08.jpg",
] as const;

export type DemoMealPhotoBotInput = {
  demoSessionId?: string | null;
  date: string | Date;
  mealTypeId: string;
  mealTypeCode?: string | null;
  route?: FeedingRoute | null;
};

export type DemoMealPhoto = {
  id: string;
  publicUrl: string;
  note: string;
  uploadedAt: string;
  uploadedBy: string;
  demoBot: true;
};

function dateKey(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  return match?.[0] ?? value;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function demoMealPhotoIndex(input: DemoMealPhotoBotInput, count = DEMO_MEAL_PHOTO_ASSETS.length) {
  if (!input.demoSessionId || count <= 0) return null;
  const key = [
    input.demoSessionId,
    dateKey(input.date),
    input.mealTypeCode ?? input.mealTypeId,
    input.route ?? "ANY",
  ].join("|");
  return stableHash(key) % count;
}

export function demoMealPhotoFor(input: DemoMealPhotoBotInput): DemoMealPhoto | null {
  const index = demoMealPhotoIndex(input);
  if (index === null) return null;
  const day = dateKey(input.date);
  const route = input.route ?? "ANY";
  return {
    id: `demo-bot:${day}:${input.mealTypeId}:${route}`,
    publicUrl: DEMO_MEAL_PHOTO_ASSETS[index],
    note: "demoMealPhotoBot.note",
    uploadedAt: `${day}T05:00:00.000Z`,
    uploadedBy: "Demo Photo Bot",
    demoBot: true,
  };
}

export function demoMealPhotoSummaryForDay(input: {
  demoSessionId: string;
  date: string | Date;
  meals: Array<{ mealTypeId: string; mealTypeCode?: string | null; route?: FeedingRoute | null }>;
}) {
  return input.meals.map((meal) => demoMealPhotoIndex({
    demoSessionId: input.demoSessionId,
    date: input.date,
    mealTypeId: meal.mealTypeId,
    mealTypeCode: meal.mealTypeCode,
    route: meal.route,
  }));
}
