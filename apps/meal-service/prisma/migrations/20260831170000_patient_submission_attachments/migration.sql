ALTER TABLE "PatientNote"
ADD COLUMN "attachmentPath" TEXT,
ADD COLUMN "attachmentMimeType" TEXT,
ADD COLUMN "attachmentSize" INTEGER;
