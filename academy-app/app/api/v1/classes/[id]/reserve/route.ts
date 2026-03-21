import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireRole('STUDENT');
  } catch {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id: classId } = await params;

  try {
    const attendance = await db.$transaction(async (tx) => {
      // 1. Verify the class exists and belongs to the student's studio
      const cls = await tx.class.findFirst({
        where: { id: classId, isActive: true },
      });
      if (!cls) {
        throw new Error('CLASS_NOT_FOUND');
      }

      // 2. Verify student has an ACTIVE membership that hasn't expired
      const now = new Date();
      const activeOrder = await tx.membershipOrder.findFirst({
        where: {
          studentId: user.id,
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
      });
      if (!activeOrder) {
        throw new Error('NO_ACTIVE_MEMBERSHIP');
      }

      // 3. Verify the class is not full (RESERVED or ATTENDED attendances)
      const activeCount = await tx.attendance.count({
        where: {
          classId,
          status: { in: ['RESERVED', 'ATTENDED'] },
        },
      });
      if (activeCount >= cls.maxCapacity) {
        throw new Error('CLASS_FULL');
      }

      // 4. Check if student is already enrolled
      const existing = await tx.attendance.findFirst({
        where: {
          classId,
          studentId: user.id,
          status: { in: ['RESERVED', 'ATTENDED'] },
        },
      });
      if (existing) {
        throw new Error('ALREADY_ENROLLED');
      }

      // 5. Verify the student has credits
      const latestLedger = await tx.creditLedger.findFirst({
        where: { studentId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (!latestLedger || latestLedger.balance <= 0) {
        throw new Error('NO_CREDITS');
      }

      const newBalance = latestLedger.balance - 1;

      // 6. Create the Attendance record
      const newAttendance = await tx.attendance.create({
        data: {
          classId,
          studentId: user.id,
          status: 'RESERVED',
          creditDeducted: true,
        },
      });

      // 7. Create the CreditLedger debit entry
      await tx.creditLedger.create({
        data: {
          studentId: user.id,
          attendanceId: newAttendance.id,
          type: 'CREDIT_DEBIT',
          amount: 1,
          balance: newBalance,
          note: `Reserva clase: ${cls.name}`,
        },
      });

      return newAttendance;
    });

    return Response.json(attendance, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ERROR';
    const statusMap: Record<string, number> = {
      CLASS_NOT_FOUND: 404,
      NO_ACTIVE_MEMBERSHIP: 403,
      CLASS_FULL: 409,
      ALREADY_ENROLLED: 409,
      NO_CREDITS: 402,
    };
    return Response.json(
      { error: message },
      { status: statusMap[message] ?? 500 }
    );
  }
}
