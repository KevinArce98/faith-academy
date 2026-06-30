-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "schedule" TEXT,
ALTER COLUMN "maxCapacity" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "MembershipPlan" ADD COLUMN     "classesPerWeek" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSingleClass" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "credits" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "enrolledAt" TIMESTAMP(3),
ADD COLUMN     "enrollmentFee" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "MonthlySubscription" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyAttendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlySubscription_period_idx" ON "MonthlySubscription"("period");

-- CreateIndex
CREATE INDEX "MonthlySubscription_studentId_idx" ON "MonthlySubscription"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySubscription_studentId_period_key" ON "MonthlySubscription"("studentId", "period");

-- CreateIndex
CREATE INDEX "MonthlyAttendance_classId_period_idx" ON "MonthlyAttendance"("classId", "period");

-- CreateIndex
CREATE INDEX "MonthlyAttendance_period_idx" ON "MonthlyAttendance"("period");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAttendance_studentId_classId_period_key" ON "MonthlyAttendance"("studentId", "classId", "period");

-- AddForeignKey
ALTER TABLE "MonthlySubscription" ADD CONSTRAINT "MonthlySubscription_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySubscription" ADD CONSTRAINT "MonthlySubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAttendance" ADD CONSTRAINT "MonthlyAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAttendance" ADD CONSTRAINT "MonthlyAttendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
