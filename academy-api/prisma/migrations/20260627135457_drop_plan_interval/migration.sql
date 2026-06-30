-- AlterTable
ALTER TABLE "MembershipPlan" DROP COLUMN "intervalType",
DROP COLUMN "intervalValue";

-- DropEnum
DROP TYPE "IntervalType";
