-- AlterTable
ALTER TABLE "Glamp" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Glamp_isTest_idx" ON "Glamp"("isTest");
