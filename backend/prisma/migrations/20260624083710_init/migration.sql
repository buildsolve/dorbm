-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'INVENTORY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'KONDITOR',
    "weeklyHours" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "notes" TEXT,
    "availableDays" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storageLocation" TEXT,
    "allergenInfo" TEXT,
    "supplierId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "supplierId" TEXT,
    "notes" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "yield" DOUBLE PRECISION NOT NULL,
    "yieldUnit" TEXT NOT NULL DEFAULT 'units',
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bakingTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "labourTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_stages" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "stageType" TEXT NOT NULL DEFAULT 'PREP',
    "labourTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bakingTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "dayOffset" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_components" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_versions" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changedBy" TEXT,
    "changeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "recipeId" TEXT,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packagingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allergenInfo" TEXT,
    "shelfLifeDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_plans" (
    "id" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_plan_lines" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "actualQuantity" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_plan_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batches" (
    "id" TEXT NOT NULL,
    "planId" TEXT,
    "productId" TEXT,
    "batchNumber" TEXT NOT NULL,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "actualQty" DOUBLE PRECISION,
    "wastageQty" DOUBLE PRECISION,
    "yieldPercent" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_usages" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "actualQty" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_plans" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_tasks" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "productId" TEXT,
    "recipeStageId" TEXT,
    "plannedDay" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "assignedTo" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "cashAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_locations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_records" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT,
    "weeklyTaskId" TEXT,
    "batchNumber" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productionDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "unitCost" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_movements" (
    "id" TEXT NOT NULL,
    "storageRecordId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esso_cost_models" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fixedOverhead" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborVariable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minBatch" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxCapacity" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "optimalBatchHint" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.002,
    "baseWasteRate" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esso_cost_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esso_cost_tiers" (
    "id" TEXT NOT NULL,
    "costModelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minQty" DOUBLE PRECISION NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "esso_cost_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esso_capacities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OVEN',
    "maxUnits" DOUBLE PRECISION NOT NULL,
    "unitLabel" TEXT NOT NULL DEFAULT 'units/week',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esso_capacities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esso_scenarios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "costModelId" TEXT,
    "minVolume" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "maxVolume" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "stepSize" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esso_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esso_results" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "sweetSpotVolume" DOUBLE PRECISION NOT NULL,
    "breakEvenVolume" DOUBLE PRECISION NOT NULL,
    "optimalMarginPct" DOUBLE PRECISION NOT NULL,
    "costCurveJson" TEXT NOT NULL,
    "recommendJson" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "esso_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_journal_entries" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "batchNumber" TEXT,
    "quantity" DOUBLE PRECISION,
    "performedBy" TEXT,
    "notes" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "powerKw" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_costs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sqm" DOUBLE PRECISION NOT NULL,
    "rentPerSqm" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_code_key" ON "ingredients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_code_key" ON "recipes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_components_recipeId_ingredientId_key" ON "recipe_components"("recipeId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_batchNumber_key" ON "production_batches"("batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_plans_year_weekNumber_key" ON "weekly_plans"("year", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "storage_locations_code_key" ON "storage_locations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "esso_cost_models_productId_key" ON "esso_cost_models"("productId");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_stages" ADD CONSTRAINT "recipe_stages_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_plan_lines" ADD CONSTRAINT "production_plan_lines_planId_fkey" FOREIGN KEY ("planId") REFERENCES "production_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_plan_lines" ADD CONSTRAINT "production_plan_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_planId_fkey" FOREIGN KEY ("planId") REFERENCES "production_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_usages" ADD CONSTRAINT "ingredient_usages_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_tasks" ADD CONSTRAINT "weekly_tasks_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_tasks" ADD CONSTRAINT "weekly_tasks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_tasks" ADD CONSTRAINT "weekly_tasks_recipeStageId_fkey" FOREIGN KEY ("recipeStageId") REFERENCES "recipe_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_records" ADD CONSTRAINT "storage_records_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_records" ADD CONSTRAINT "storage_records_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_records" ADD CONSTRAINT "storage_records_weeklyTaskId_fkey" FOREIGN KEY ("weeklyTaskId") REFERENCES "weekly_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_movements" ADD CONSTRAINT "storage_movements_storageRecordId_fkey" FOREIGN KEY ("storageRecordId") REFERENCES "storage_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esso_cost_models" ADD CONSTRAINT "esso_cost_models_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esso_cost_tiers" ADD CONSTRAINT "esso_cost_tiers_costModelId_fkey" FOREIGN KEY ("costModelId") REFERENCES "esso_cost_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esso_scenarios" ADD CONSTRAINT "esso_scenarios_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esso_scenarios" ADD CONSTRAINT "esso_scenarios_costModelId_fkey" FOREIGN KEY ("costModelId") REFERENCES "esso_cost_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esso_results" ADD CONSTRAINT "esso_results_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "esso_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
