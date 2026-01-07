-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('UNPAID', 'PAID');

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN "status" "CommissionStatus" NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");
