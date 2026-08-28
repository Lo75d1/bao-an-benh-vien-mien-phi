CREATE TABLE "DemoSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "workspace" TEXT NOT NULL DEFAULT 'NURSE',
    "stateJson" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DemoSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DemoSession_tokenHash_key" ON "DemoSession"("tokenHash");
CREATE INDEX "DemoSession_expiresAt_idx" ON "DemoSession"("expiresAt");
