ALTER TABLE "MealType" ADD COLUMN "feedingRoute" "FeedingRoute" NOT NULL DEFAULT 'NORMAL';

CREATE INDEX "MealType_feedingRoute_status_sortOrder_idx" ON "MealType"("feedingRoute", "status", "sortOrder");
