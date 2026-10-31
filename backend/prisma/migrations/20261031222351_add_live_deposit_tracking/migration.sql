-- AlterTable
ALTER TABLE "cash_counts" ADD COLUMN "openingBalanceSince" TIMESTAMP(3);
ALTER TABLE "cash_counts" ADD COLUMN "depositsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
