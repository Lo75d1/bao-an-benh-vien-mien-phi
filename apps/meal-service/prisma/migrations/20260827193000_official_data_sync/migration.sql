CREATE TYPE "DataSyncSource" AS ENUM ('VDD_FOOD', 'VDD_DISH', 'RNI_DISH');
CREATE TYPE "DataSyncStatus" AS ENUM ('PREVIEW', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "DataSyncJob" (
  "id" TEXT NOT NULL,
  "source" "DataSyncSource" NOT NULL,
  "status" "DataSyncStatus" NOT NULL DEFAULT 'PREVIEW',
  "requestedById" TEXT NOT NULL,
  "reason" TEXT,
  "previewJson" JSONB,
  "checkpointJson" JSONB,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "createdCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DataSyncJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DataSyncJob" ADD CONSTRAINT "DataSyncJob_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "DataSyncJob_status_createdAt_idx" ON "DataSyncJob"("status", "createdAt");
CREATE INDEX "DataSyncJob_source_createdAt_idx" ON "DataSyncJob"("source", "createdAt");
