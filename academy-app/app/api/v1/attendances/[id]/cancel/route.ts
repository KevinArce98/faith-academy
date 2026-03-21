import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { promoteWaitlist } from '@/lib/utils/waitlist';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireRole(['ADMIN', 'TEACHER', 'STUDENT']);
  } catch {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id: attendanceId } = await params;

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Find the attendance and verify it belongs to the auth user
      const attendance = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { class: true },
      });

      if (!attendance) {
        throw new Error('ATTENDANCE_NOT_FOUND');
      }
      if (attendance.studentId !== user.id) {
        throw new Error('FORBIDDEN');
      }
      if (attendance.status !== 'RESERVED') {
        throw new Error('NOT_CANCELLABLE');
      }

      // 2. Check whether we're within the cancellation window
      const now = new Date();
      const hoursUntilClass =
        (attendance.class.startsAt.getTime() - now.getTime()) /
        (1000 * 60 * 60);
      const withinWindow =
        hoursUntilClass >= 0 &&
        hoursUntilClass >= attendance.class.cancelWindowHours;

      // 3. Update Attendance to CANCELLED
      await tx.attendance.update({
        where: { id: attendanceId },
        data: { status: 'CANCELLED', cancelledAt: now },
      });

      let creditRefunded = false;

      // 4. If within cancellation window and a credit was deducted, refund it
      if (withinWindow && attendance.creditDeducted) {
        const latestLedger = await tx.creditLedger.findFirst({
          where: { studentId: user.id },
          orderBy: { createdAt: 'desc' },
        });

        const currentBalance = latestLedger?.balance ?? 0;

        await tx.creditLedger.create({
          data: {
            studentId: user.id,
            attendanceId,
            type: 'CREDIT_REFUND',
            amount: 1,
            balance: currentBalance + 1,
            note: `Cancelación clase: ${attendance.class.name}`,
          },
        });

        creditRefunded = true;

        // 5. Promote the next person on the waitlist
        await promoteWaitlist(
          attendance.classId,
          tx
        );
      }

      return { cancelled: true, creditRefunded };
    });

    return Response.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ERROR';
    const statusMap: Record<string, number> = {
      ATTENDANCE_NOT_FOUND: 404,
      FORBIDDEN: 403,
      NOT_CANCELLABLE: 409,
    };
    return Response.json(
      { error: message },
      { status: statusMap[message] ?? 500 }
    );
  }
}
