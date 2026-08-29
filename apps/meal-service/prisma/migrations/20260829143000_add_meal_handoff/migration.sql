CREATE TABLE "MealHandoff" (
    "id" TEXT NOT NULL,
    "mealEventId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "handedOffAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handedOffById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MealHandoff_mealEventId_departmentId_key" ON "MealHandoff"("mealEventId", "departmentId");
CREATE INDEX "MealHandoff_departmentId_handedOffAt_idx" ON "MealHandoff"("departmentId", "handedOffAt");

ALTER TABLE "MealHandoff" ADD CONSTRAINT "MealHandoff_mealEventId_fkey" FOREIGN KEY ("mealEventId") REFERENCES "MealEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealHandoff" ADD CONSTRAINT "MealHandoff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealHandoff" ADD CONSTRAINT "MealHandoff_handedOffById_fkey" FOREIGN KEY ("handedOffById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
