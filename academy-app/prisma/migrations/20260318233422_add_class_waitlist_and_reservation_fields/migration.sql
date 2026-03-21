-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "IntervalType" AS ENUM ('WEEKLY', 'MONTHLY', 'FIXED_PACKAGE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'EXPIRED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('CREDIT_GRANT', 'CREDIT_DEBIT', 'CREDIT_REFUND', 'CREDIT_EXPIRY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('RESERVED', 'ATTENDED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'DOCUMENT', 'IMAGE');

-- CreateTable
CREATE TABLE "Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "tier" "Tier" NOT NULL DEFAULT 'BASIC',
    "familyDiscounts" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL,
    "studioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "credits" INTEGER NOT NULL,
    "intervalType" "IntervalType" NOT NULL,
    "intervalValue" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipOrder" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "receiptUrl" TEXT,
    "creditGranted" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "orderId" TEXT,
    "attendanceId" TEXT,
    "type" "LedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "skillLevel" "SkillLevel" NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    "cancelWindowHours" INTEGER NOT NULL DEFAULT 24,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'RESERVED',
    "creditDeducted" BOOLEAN NOT NULL DEFAULT false,
    "qrToken" TEXT,
    "checkedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassWaitlist" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillLevel" "SkillLevel" NOT NULL,
    "discipline" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ContentType" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Studio_slug_key" ON "Studio"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_clerkId_key" ON "UserProfile"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_studentId_key" ON "FamilyMember"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_qrToken_key" ON "Attendance"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "ClassWaitlist_classId_studentId_key" ON "ClassWaitlist"("classId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_studentId_key" ON "Streak"("studentId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipOrder" ADD CONSTRAINT "MembershipOrder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipOrder" ADD CONSTRAINT "MembershipOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MembershipOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassWaitlist" ADD CONSTRAINT "ClassWaitlist_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
