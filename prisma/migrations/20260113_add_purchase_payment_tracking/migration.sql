-- CreateEnum
CREATE TYPE "PurchasePaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "paymentStatus" "PurchasePaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "dueDate" TIMESTAMP(3),
ADD COLUMN "paidAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Purchase_paymentStatus_idx" ON "Purchase"("paymentStatus");
