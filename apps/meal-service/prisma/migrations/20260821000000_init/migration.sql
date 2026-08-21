-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'DIETITIAN', 'NURSE', 'KITCHEN');

-- CreateEnum
CREATE TYPE "public"."ActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."FeedingRoute" AS ENUM ('NORMAL', 'SONDE');

-- CreateEnum
CREATE TYPE "public"."DietMealStatus" AS ENUM ('PLANNED', 'LOCKED', 'PREPARING', 'PREPARED', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ServingReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AdditionKind" AS ENUM ('SUPPLEMENT', 'URGENT_POST_SERVE');

-- CreateEnum
CREATE TYPE "public"."AckStatus" AS ENUM ('PENDING', 'RECEIVED', 'INSUFFICIENT', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "public"."EvidenceKind" AS ENUM ('MEAL_PHOTO', 'FOOD_SAMPLE', 'STOCK_IN', 'INVOICE');

-- CreateEnum
CREATE TYPE "public"."PatientNoteStatus" AS ENUM ('RECEIVED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."WarehouseKind" AS ENUM ('GENERAL', 'KITCHEN', 'SONDE');

-- CreateEnum
CREATE TYPE "public"."InventoryType" AS ENUM ('IN', 'OUT', 'ADJUST');

-- CreateEnum
CREATE TYPE "public"."DocumentKind" AS ENUM ('BILL', 'INVOICE', 'PHOTO', 'OTHER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "status" "public"."ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "status" "public"."ActiveStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DepartmentMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "DepartmentMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MealType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cutoffTime" TEXT NOT NULL,
    "serviceTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."ActiveStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "MealType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DietType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feedingRoute" "public"."FeedingRoute" NOT NULL DEFAULT 'NORMAL',
    "dietCodeRefId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."ActiveStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "DietType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MealEvent" (
    "id" TEXT NOT NULL,
    "mealDate" DATE NOT NULL,
    "mealTypeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DietMeal" (
    "id" TEXT NOT NULL,
    "mealEventId" TEXT NOT NULL,
    "dietTypeId" TEXT NOT NULL,
    "feedingRoute" "public"."FeedingRoute" NOT NULL,
    "menuSnapshotJson" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "servingsPlanned" INTEGER NOT NULL DEFAULT 0,
    "evaluationJson" JSONB,
    "status" "public"."DietMealStatus" NOT NULL DEFAULT 'PLANNED',
    "internalNote" TEXT,
    "patientVisibleNote" TEXT,
    "voidedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedReason" TEXT,

    CONSTRAINT "DietMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServingReport" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "mealEventId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" "public"."ServingReportStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,

    CONSTRAINT "ServingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServingReportLine" (
    "id" TEXT NOT NULL,
    "servingReportId" TEXT NOT NULL,
    "dietTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ServingReportLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LateMealAddition" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "mealEventId" TEXT NOT NULL,
    "dietTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "public"."AdditionKind" NOT NULL,
    "ackStatus" "public"."AckStatus" NOT NULL DEFAULT 'PENDING',
    "ackById" TEXT,
    "ackAt" TIMESTAMP(3),
    "kitchenNote" TEXT,

    CONSTRAINT "LateMealAddition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MealEvidence" (
    "id" TEXT NOT NULL,
    "dietMealId" TEXT NOT NULL,
    "kind" "public"."EvidenceKind" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "MealEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatientNote" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "mealDate" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "contactName" TEXT,
    "status" "public"."PatientNoteStatus" NOT NULL DEFAULT 'RECEIVED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "PatientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Warehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "public"."WarehouseKind" NOT NULL,
    "status" "public"."ActiveStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryTransaction" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "type" "public"."InventoryType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "relatedDietMealId" TEXT,
    "voidedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedReason" TEXT,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryTransactionLine" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "foodId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,2),

    CONSTRAINT "InventoryTransactionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "kind" "public"."DocumentKind" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuTemplate" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dietTypeId" TEXT,
    "feedingRoute" "public"."FeedingRoute",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "foodId" TEXT,
    "itemName" TEXT NOT NULL,
    "grams" DECIMAL(10,2) NOT NULL,
    "wastePercent" DECIMAL(5,2),

    CONSTRAINT "MenuTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AppSetting" (
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Food" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "source" TEXT,
    "sourceCode" TEXT,
    "sourceNote" TEXT,
    "unit" TEXT,
    "wastePercent" DOUBLE PRECISION,
    "foodType" TEXT,
    "foodGroup" TEXT,
    "proteinOrigin" TEXT,
    "giLevel" INTEGER,
    "purinLevel" INTEGER,
    "cholesterolLevel" INTEGER,
    "energyKcal" DOUBLE PRECISION,
    "waterG" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION,
    "lipidG" DOUBLE PRECISION,
    "glucidG" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "potassiumMg" DOUBLE PRECISION,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "source" TEXT,
    "sourceCode" TEXT,
    "totalWeightG" DOUBLE PRECISION,
    "servingUnit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DishIngredient" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "foodId" TEXT,
    "foodNameRaw" TEXT NOT NULL,
    "quantityG" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "energyKcalRaw" DOUBLE PRECISION,

    CONSTRAINT "DishIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FoodAlias" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "aliasNormalized" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,

    CONSTRAINT "FoodAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DietCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetGroup" TEXT,
    "diseaseGroup" TEXT,
    "energyKcalMin" DOUBLE PRECISION,
    "energyKcalMax" DOUBLE PRECISION,
    "proteinGMin" DOUBLE PRECISION,
    "proteinGMax" DOUBLE PRECISION,
    "lipidGMin" DOUBLE PRECISION,
    "lipidGMax" DOUBLE PRECISION,
    "glucidGMin" DOUBLE PRECISION,
    "glucidGMax" DOUBLE PRECISION,
    "sodiumMgMin" DOUBLE PRECISION,
    "sodiumMgMax" DOUBLE PRECISION,
    "potassiumMgMin" DOUBLE PRECISION,
    "potassiumMgMax" DOUBLE PRECISION,
    "waterGMin" DOUBLE PRECISION,
    "waterGMax" DOUBLE PRECISION,
    "mealsMin" INTEGER,
    "mealsMax" INTEGER,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "DietCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NutritionRecommendation" (
    "id" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "physicalActivity" TEXT,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "NutritionRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChildGrowthStandard" (
    "id" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "sex" TEXT,
    "ageMonth" INTEGER,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "ChildGrowthStandard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "public"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "public"."Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_publicToken_key" ON "public"."Department"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentMembership_userId_departmentId_key" ON "public"."DepartmentMembership"("userId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MealType_code_key" ON "public"."MealType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DietType_code_key" ON "public"."DietType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MealEvent_mealDate_mealTypeId_key" ON "public"."MealEvent"("mealDate", "mealTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "DietMeal_mealEventId_dietTypeId_key" ON "public"."DietMeal"("mealEventId", "dietTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ServingReport_departmentId_mealEventId_key" ON "public"."ServingReport"("departmentId", "mealEventId");

-- CreateIndex
CREATE UNIQUE INDEX "ServingReportLine_servingReportId_dietTypeId_key" ON "public"."ServingReportLine"("servingReportId", "dietTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "public"."Warehouse"("code");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Food_nameNormalized_idx" ON "public"."Food"("nameNormalized");

-- CreateIndex
CREATE INDEX "Dish_nameNormalized_idx" ON "public"."Dish"("nameNormalized");

-- CreateIndex
CREATE INDEX "DishIngredient_dishId_idx" ON "public"."DishIngredient"("dishId");

-- CreateIndex
CREATE INDEX "FoodAlias_aliasNormalized_idx" ON "public"."FoodAlias"("aliasNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "DietCode_code_key" ON "public"."DietCode"("code");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepartmentMembership" ADD CONSTRAINT "DepartmentMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepartmentMembership" ADD CONSTRAINT "DepartmentMembership_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DietType" ADD CONSTRAINT "DietType_dietCodeRefId_fkey" FOREIGN KEY ("dietCodeRefId") REFERENCES "public"."DietCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealEvent" ADD CONSTRAINT "MealEvent_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "public"."MealType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DietMeal" ADD CONSTRAINT "DietMeal_mealEventId_fkey" FOREIGN KEY ("mealEventId") REFERENCES "public"."MealEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DietMeal" ADD CONSTRAINT "DietMeal_dietTypeId_fkey" FOREIGN KEY ("dietTypeId") REFERENCES "public"."DietType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DietMeal" ADD CONSTRAINT "DietMeal_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DietMeal" ADD CONSTRAINT "DietMeal_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServingReport" ADD CONSTRAINT "ServingReport_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServingReport" ADD CONSTRAINT "ServingReport_mealEventId_fkey" FOREIGN KEY ("mealEventId") REFERENCES "public"."MealEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServingReport" ADD CONSTRAINT "ServingReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServingReportLine" ADD CONSTRAINT "ServingReportLine_servingReportId_fkey" FOREIGN KEY ("servingReportId") REFERENCES "public"."ServingReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServingReportLine" ADD CONSTRAINT "ServingReportLine_dietTypeId_fkey" FOREIGN KEY ("dietTypeId") REFERENCES "public"."DietType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LateMealAddition" ADD CONSTRAINT "LateMealAddition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LateMealAddition" ADD CONSTRAINT "LateMealAddition_mealEventId_fkey" FOREIGN KEY ("mealEventId") REFERENCES "public"."MealEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LateMealAddition" ADD CONSTRAINT "LateMealAddition_dietTypeId_fkey" FOREIGN KEY ("dietTypeId") REFERENCES "public"."DietType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LateMealAddition" ADD CONSTRAINT "LateMealAddition_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LateMealAddition" ADD CONSTRAINT "LateMealAddition_ackById_fkey" FOREIGN KEY ("ackById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealEvidence" ADD CONSTRAINT "MealEvidence_dietMealId_fkey" FOREIGN KEY ("dietMealId") REFERENCES "public"."DietMeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealEvidence" ADD CONSTRAINT "MealEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientNote" ADD CONSTRAINT "PatientNote_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientNote" ADD CONSTRAINT "PatientNote_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_relatedDietMealId_fkey" FOREIGN KEY ("relatedDietMealId") REFERENCES "public"."DietMeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransactionLine" ADD CONSTRAINT "InventoryTransactionLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."InventoryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransactionLine" ADD CONSTRAINT "InventoryTransactionLine_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."InventoryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuTemplate" ADD CONSTRAINT "MenuTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuTemplate" ADD CONSTRAINT "MenuTemplate_dietTypeId_fkey" FOREIGN KEY ("dietTypeId") REFERENCES "public"."DietType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuTemplateItem" ADD CONSTRAINT "MenuTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."MenuTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuTemplateItem" ADD CONSTRAINT "MenuTemplateItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DishIngredient" ADD CONSTRAINT "DishIngredient_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "public"."Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DishIngredient" ADD CONSTRAINT "DishIngredient_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FoodAlias" ADD CONSTRAINT "FoodAlias_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
