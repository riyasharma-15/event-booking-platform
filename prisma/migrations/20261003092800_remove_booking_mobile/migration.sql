/*
  Warnings:

  - You are about to drop the column `mobile` on the `Booking` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Booking_eventId_mobile_key";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "mobile";
