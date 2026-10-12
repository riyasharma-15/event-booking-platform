-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- CreateEnum
CREATE TYPE "OrganizerStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "organizerStatus" "OrganizerStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "organizationName" TEXT,
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "organizationDescription" TEXT,
ADD COLUMN "organizationPurpose" TEXT,
ADD COLUMN "rejectionReason" TEXT;
