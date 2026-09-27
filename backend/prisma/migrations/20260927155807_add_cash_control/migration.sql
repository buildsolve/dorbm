-- CreateTable
CREATE TABLE "cash_counts" (
    "id" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posCashSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withdrawalsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "signatureImage" TEXT,
    "signedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denomination_counts" (
    "id" TEXT NOT NULL,
    "cashCountId" TEXT NOT NULL,
    "denomination" DOUBLE PRECISION NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "denomination_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_withdrawals" (
    "id" TEXT NOT NULL,
    "cashCountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_control_settings" (
    "id" TEXT NOT NULL,
    "alertRecipients" TEXT NOT NULL DEFAULT '',
    "dailyCutoffTime" TEXT NOT NULL DEFAULT '23:00',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "discrepancyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initialOpeningBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastMissingAlertDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_control_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_counts_businessDate_key" ON "cash_counts"("businessDate");

-- AddForeignKey
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denomination_counts" ADD CONSTRAINT "denomination_counts_cashCountId_fkey" FOREIGN KEY ("cashCountId") REFERENCES "cash_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_withdrawals" ADD CONSTRAINT "cash_withdrawals_cashCountId_fkey" FOREIGN KEY ("cashCountId") REFERENCES "cash_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
