-- AlterTable: coin rolls are now part of the same daily CashCount, not a separate document.
ALTER TABLE "cash_counts" ADD COLUMN "coinRollTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Re-point coin_roll_lines at cash_counts instead of the now-removed coin_roll_counts.
ALTER TABLE "coin_roll_lines" DROP CONSTRAINT "coin_roll_lines_coinRollCountId_fkey";
ALTER TABLE "coin_roll_lines" RENAME COLUMN "coinRollCountId" TO "cashCountId";
ALTER TABLE "coin_roll_lines" ADD CONSTRAINT "coin_roll_lines_cashCountId_fkey" FOREIGN KEY ("cashCountId") REFERENCES "cash_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
DROP TABLE "coin_roll_counts";
