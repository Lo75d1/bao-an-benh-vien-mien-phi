ALTER TABLE "MealEvidence" ALTER COLUMN "dietMealId" DROP NOT NULL;
ALTER TABLE "MealEvidence" ADD COLUMN "mealEventId" TEXT;

-- Before this change FOOD_SAMPLE was used for per-diet-code photos. Keep those
-- attachments with the meal-photo meaning; FOOD_SAMPLE now belongs to the whole event.
UPDATE "MealEvidence"
SET "kind" = 'MEAL_PHOTO'
WHERE "kind" = 'FOOD_SAMPLE' AND "dietMealId" IS NOT NULL;

ALTER TABLE "MealEvidence"
  ADD CONSTRAINT "MealEvidence_mealEventId_fkey"
  FOREIGN KEY ("mealEventId") REFERENCES "MealEvent"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MealEvidence"
  ADD CONSTRAINT "MealEvidence_exactly_one_owner_check"
  CHECK (("dietMealId" IS NOT NULL) <> ("mealEventId" IS NOT NULL));

CREATE INDEX "MealEvidence_mealEventId_kind_uploadedAt_idx"
  ON "MealEvidence"("mealEventId", "kind", "uploadedAt");
