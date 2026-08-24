CREATE TABLE "PublicPageView" (
    "id" TEXT NOT NULL,
    "viewedOn" DATE NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicPageView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicPageView_viewedOn_visitorHash_key" ON "PublicPageView"("viewedOn", "visitorHash");
CREATE INDEX "PublicPageView_viewedOn_idx" ON "PublicPageView"("viewedOn");
