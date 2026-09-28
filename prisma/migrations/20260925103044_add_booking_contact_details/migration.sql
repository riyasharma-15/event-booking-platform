/*
  Warnings:

  - A unique constraint covering the columns `[eventId,email]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId,mobile]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mobile` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "mobile" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_eventId_email_key" ON "Booking"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_eventId_mobile_key" ON "Booking"("eventId", "mobile");
