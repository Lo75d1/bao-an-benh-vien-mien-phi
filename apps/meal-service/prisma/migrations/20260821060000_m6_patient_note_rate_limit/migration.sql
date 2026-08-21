ALTER TABLE "PatientNote"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "PatientNote_departmentId_status_createdAt_idx"
ON "PatientNote"("departmentId", "status", "createdAt");

CREATE INDEX "PatientNote_departmentId_ipHash_createdAt_idx"
ON "PatientNote"("departmentId", "ipHash", "createdAt");
