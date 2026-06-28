-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('confirmed', 'cancelled');

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Booking_valid_time_range_check" CHECK ("endTime" > "startTime")
);

-- CreateIndex
CREATE INDEX "Booking_providerId_startTime_endTime_idx" ON "Booking"("providerId", "startTime", "endTime");

-- CreateExclusionConstraint
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_no_provider_overlap_excl"
EXCLUDE USING GIST (
    "providerId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
)
WHERE ("status" = 'confirmed');
