CREATE TYPE "DeliveryReceiptStatus" AS ENUM ('FULL', 'SHORT');

CREATE TABLE "MealDeliveryReceipt" (
  "id" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "mealEventId" TEXT NOT NULL,
  "expectedQuantity" INTEGER NOT NULL,
  "receivedQuantity" INTEGER NOT NULL,
  "status" "DeliveryReceiptStatus" NOT NULL,
  "note" TEXT,
  "confirmedById" TEXT NOT NULL,
  "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MealDeliveryReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MealDeliveryReceipt_departmentId_mealEventId_key" ON "MealDeliveryReceipt"("departmentId", "mealEventId");
CREATE INDEX "MealDeliveryReceipt_mealEventId_status_idx" ON "MealDeliveryReceipt"("mealEventId", "status");
ALTER TABLE "MealDeliveryReceipt" ADD CONSTRAINT "MealDeliveryReceipt_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealDeliveryReceipt" ADD CONSTRAINT "MealDeliveryReceipt_mealEventId_fkey" FOREIGN KEY ("mealEventId") REFERENCES "MealEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealDeliveryReceipt" ADD CONSTRAINT "MealDeliveryReceipt_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
