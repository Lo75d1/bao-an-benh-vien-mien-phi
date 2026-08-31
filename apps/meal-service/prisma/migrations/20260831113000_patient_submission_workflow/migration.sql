CREATE TYPE "public"."PatientSubmissionType" AS ENUM ('MEAL_NOTE', 'FEEDBACK');
CREATE TYPE "public"."PatientSubmissionStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'FORWARDED_TO_KITCHEN', 'RESOLVED', 'REJECTED');

ALTER TABLE "public"."PatientNote"
ADD COLUMN "mealEventId" TEXT,
ADD COLUMN "type" "public"."PatientSubmissionType" NOT NULL DEFAULT 'MEAL_NOTE',
ADD COLUMN "contactInfo" TEXT,
ADD COLUMN "submissionStatus" "public"."PatientSubmissionStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "forwardedToKitchenAt" TIMESTAMP(3),
ADD COLUMN "forwardedById" TEXT,
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "resolvedById" TEXT;

UPDATE "public"."PatientNote"
SET "submissionStatus" = CASE "status"
  WHEN 'APPROVED' THEN 'FORWARDED_TO_KITCHEN'::"public"."PatientSubmissionStatus"
  WHEN 'REJECTED' THEN 'REJECTED'::"public"."PatientSubmissionStatus"
  ELSE 'NEW'::"public"."PatientSubmissionStatus"
END;

UPDATE "public"."PatientNote"
SET "forwardedToKitchenAt" = "reviewedAt",
    "forwardedById" = "reviewedById"
WHERE "status" = 'APPROVED'
  AND "reviewedAt" IS NOT NULL;

CREATE INDEX "PatientNote_type_submissionStatus_createdAt_idx"
ON "public"."PatientNote"("type", "submissionStatus", "createdAt");

CREATE INDEX "PatientNote_departmentId_type_submissionStatus_mealDate_idx"
ON "public"."PatientNote"("departmentId", "type", "submissionStatus", "mealDate");

CREATE INDEX "PatientNote_mealEventId_type_submissionStatus_idx"
ON "public"."PatientNote"("mealEventId", "type", "submissionStatus");

ALTER TABLE "public"."PatientNote"
ADD CONSTRAINT "PatientNote_mealEventId_fkey"
FOREIGN KEY ("mealEventId") REFERENCES "public"."MealEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."PatientNote"
ADD CONSTRAINT "PatientNote_forwardedById_fkey"
FOREIGN KEY ("forwardedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."PatientNote"
ADD CONSTRAINT "PatientNote_resolvedById_fkey"
FOREIGN KEY ("resolvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
