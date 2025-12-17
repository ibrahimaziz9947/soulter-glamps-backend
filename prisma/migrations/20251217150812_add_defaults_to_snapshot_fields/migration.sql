/*
  Warnings:

  - Made the column `customerName` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `glampName` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `guests` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "customerName" SET NOT NULL,
ALTER COLUMN "customerName" SET DEFAULT 'Unknown',
ALTER COLUMN "glampName" SET NOT NULL,
ALTER COLUMN "glampName" SET DEFAULT 'Unknown',
ALTER COLUMN "guests" SET NOT NULL,
ALTER COLUMN "guests" SET DEFAULT 1;
