ALTER TABLE "User" ADD COLUMN "kitchenRoute" "FeedingRoute";

UPDATE "User" SET "kitchenRoute" = 'NORMAL' WHERE "role" = 'KITCHEN';
