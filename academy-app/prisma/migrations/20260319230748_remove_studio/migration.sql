/*
  Warnings:

  - You are about to drop the column `studioId` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `ClassWaitlist` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `CreditLedger` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `Family` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `MembershipOrder` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `MembershipPlan` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the `Studio` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_studioId_fkey";

-- DropForeignKey
ALTER TABLE "ClassWaitlist" DROP CONSTRAINT "ClassWaitlist_studioId_fkey";

-- DropForeignKey
ALTER TABLE "Family" DROP CONSTRAINT "Family_studioId_fkey";

-- DropForeignKey
ALTER TABLE "MembershipPlan" DROP CONSTRAINT "MembershipPlan_studioId_fkey";

-- DropForeignKey
ALTER TABLE "UserProfile" DROP CONSTRAINT "UserProfile_studioId_fkey";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "studioId";

-- AlterTable
ALTER TABLE "ClassWaitlist" DROP COLUMN "studioId";

-- AlterTable
ALTER TABLE "CreditLedger" DROP COLUMN "studioId";

-- AlterTable
ALTER TABLE "Family" DROP COLUMN "studioId";

-- AlterTable
ALTER TABLE "MembershipOrder" DROP COLUMN "studioId";

-- AlterTable
ALTER TABLE "MembershipPlan" DROP COLUMN "studioId";

-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "studioId";

-- DropTable
DROP TABLE "Studio";

-- DropEnum
DROP TYPE "Tier";
