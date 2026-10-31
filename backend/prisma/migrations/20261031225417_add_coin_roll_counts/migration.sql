-- CreateTable
CREATE TABLE "coin_roll_counts" (
    "id" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signatureImage" TEXT,
    "signedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_roll_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_roll_lines" (
    "id" TEXT NOT NULL,
    "coinRollCountId" TEXT NOT NULL,
    "denomination" DOUBLE PRECISION NOT NULL,
    "coinsPerRoll" INTEGER NOT NULL,
    "rollQuantity" INTEGER NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "coin_roll_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coin_roll_counts_businessDate_key" ON "coin_roll_counts"("businessDate");

-- AddForeignKey
ALTER TABLE "coin_roll_counts" ADD CONSTRAINT "coin_roll_counts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_roll_lines" ADD CONSTRAINT "coin_roll_lines_coinRollCountId_fkey" FOREIGN KEY ("coinRollCountId") REFERENCES "coin_roll_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
