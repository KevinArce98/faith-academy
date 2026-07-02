-- DropForeignKey
ALTER TABLE "ClassWaitlist" DROP CONSTRAINT "ClassWaitlist_classId_fkey";

-- DropForeignKey
ALTER TABLE "ClassWaitlist" DROP CONSTRAINT "ClassWaitlist_studentId_fkey";

-- DropForeignKey
ALTER TABLE "CreditLedger" DROP CONSTRAINT "CreditLedger_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Streak" DROP CONSTRAINT "Streak_studentId_fkey";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "creditDeducted";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "cancelWindowHours",
DROP COLUMN "creditCost";

-- AlterTable
ALTER TABLE "MembershipOrder" DROP COLUMN "creditGranted";

-- AlterTable
ALTER TABLE "MembershipPlan" DROP COLUMN "credits";

-- DropTable
DROP TABLE "ClassWaitlist";

-- DropTable
DROP TABLE "CreditLedger";

-- DropTable
DROP TABLE "Streak";

-- DropEnum
DROP TYPE "LedgerType";
