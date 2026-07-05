-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
