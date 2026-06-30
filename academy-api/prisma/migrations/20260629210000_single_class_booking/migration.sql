-- AlterTable: reserva de clase suelta en la orden
ALTER TABLE "MembershipOrder" ADD COLUMN "bookingClassId" TEXT;
ALTER TABLE "MembershipOrder" ADD COLUMN "bookingDate" DATE;

-- AlterTable: fecha de sesión en la inscripción (clase suelta)
ALTER TABLE "MonthlyAttendance" ADD COLUMN "sessionDate" DATE;

-- AddForeignKey
ALTER TABLE "MembershipOrder" ADD CONSTRAINT "MembershipOrder_bookingClassId_fkey" FOREIGN KEY ("bookingClassId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
