-- AlterTable
ALTER TABLE "weekly_tasks" ADD COLUMN     "customPrice" DOUBLE PRECISION,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "isCustomOrder" BOOLEAN NOT NULL DEFAULT false;
