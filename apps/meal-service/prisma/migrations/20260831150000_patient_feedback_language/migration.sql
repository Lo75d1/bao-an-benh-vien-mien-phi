CREATE TYPE "public"."PatientSubmissionType" AS ENUM ('FEEDBACK', 'KITCHEN_NOTE');

ALTER TABLE "public"."User"
ADD COLUMN "language" TEXT NOT NULL DEFAULT 'vi';

ALTER TABLE "public"."PatientNote"
ADD COLUMN "type" "public"."PatientSubmissionType" NOT NULL DEFAULT 'KITCHEN_NOTE',
ADD COLUMN "contactInfo" TEXT;

CREATE INDEX "PatientNote_type_status_createdAt_idx"
ON "public"."PatientNote"("type", "status", "createdAt");
