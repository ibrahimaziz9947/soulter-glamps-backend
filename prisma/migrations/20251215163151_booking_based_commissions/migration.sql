/*
  Warnings:

  - A unique constraint covering the columns `[bookingId]` on the table `AgentCommission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookingId` to the `AgentCommission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AgentCommission" ADD COLUMN     "bookingId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "agentId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "AgentCommission_bookingId_key" ON "AgentCommission"("bookingId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCommission" ADD CONSTRAINT "AgentCommission_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
