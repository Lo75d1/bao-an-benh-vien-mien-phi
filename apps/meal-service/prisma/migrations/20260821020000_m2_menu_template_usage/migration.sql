ALTER TABLE "DietMeal" ADD COLUMN "sourceTemplateId" TEXT;

CREATE INDEX "DietMeal_sourceTemplateId_idx" ON "DietMeal"("sourceTemplateId");

ALTER TABLE "DietMeal"
ADD CONSTRAINT "DietMeal_sourceTemplateId_fkey"
FOREIGN KEY ("sourceTemplateId") REFERENCES "MenuTemplate"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
