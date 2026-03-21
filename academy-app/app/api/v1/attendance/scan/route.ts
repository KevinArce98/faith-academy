import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyQRPayload } from '@/lib/qr';

export async function POST(req: Request) {
  let user;
  try {
    user = await requireRole('TEACHER');
  } catch {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { token } = await req.json();
  if (!token || typeof token !== 'string') {
    return Response.json({ ok: false, reason: 'INVALID_QR' }, { status: 400 });
  }

  // Verify JWT signature
  let qrPayload: Awaited<ReturnType<typeof verifyQRPayload>>;
  try {
    qrPayload = await verifyQRPayload(token);
  } catch {
    return Response.json({ ok: false, reason: 'INVALID_QR' }, { status: 400 });
  }

  const { studentId } = qrPayload;

  try {
    const result = await db.$transaction(async (tx) => {
      const now = new Date();

      // Verify active membership
      const activeOrder = await tx.membershipOrder.findFirst({
        where: {
          studentId,
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
        orderBy: { expiresAt: 'desc' },
      });

      if (!activeOrder) {
        throw new Error('MEMBERSHIP_INACTIVE');
      }

      // SELECT FOR UPDATE on CreditLedger to prevent double-spend
      const ledgerRows = await tx.$queryRaw<{ id: string; balance: number }[]>`
        SELECT id, balance
        FROM "CreditLedger"
        WHERE "studentId" = ${studentId}
        ORDER BY "createdAt" DESC
        LIMIT 1
        FOR UPDATE
      `;

      const latestLedger = ledgerRows[0] ?? null;
      if (!latestLedger || latestLedger.balance <= 0) {
        throw new Error('NO_CREDITS');
      }

      const newBalance = latestLedger.balance - 1;

      // Get student profile for response
      const student = await tx.userProfile.findUnique({
        where: { id: studentId },
        select: { name: true, avatarUrl: true },
      });

      // Update existing Attendance → ATTENDED, or create a new one
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const existingAttendance = await tx.attendance.findFirst({
        where: {
          studentId,
          status: { in: ['RESERVED', 'ATTENDED'] },
          class: {
            startsAt: { lte: twoHoursLater },
            endsAt: { gte: now },
          },
        },
        include: { class: true },
        orderBy: { createdAt: 'desc' },
      });

      if (existingAttendance) {
        await tx.attendance.update({
          where: { id: existingAttendance.id },
          data: { status: 'ATTENDED', checkedAt: now },
        });
      } else {
        // No reservation — create a walk-in attendance
        const nextClass = await tx.class.findFirst({
          where: {
            isActive: true,
            startsAt: { lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
            endsAt: { gte: now },
          },
          orderBy: { startsAt: 'asc' },
        });

        if (!nextClass) {
          throw new Error('NO_ACTIVE_CLASS');
        }

        await tx.attendance.create({
          data: {
            classId: nextClass.id,
            studentId,
            status: 'ATTENDED',
            checkedAt: now,
            creditDeducted: true,
          },
        });
      }

      // Debit credit
      await tx.creditLedger.create({
        data: {
          studentId,
          type: 'CREDIT_DEBIT',
          amount: 1,
          balance: newBalance,
          note: 'Asistencia por scanner QR',
        },
      });

      // nearExpiry: expires within 7 days
      const msIn7Days = 7 * 24 * 60 * 60 * 1000;
      const nearExpiry =
        activeOrder.expiresAt != null &&
        activeOrder.expiresAt.getTime() - now.getTime() < msIn7Days;

      return {
        ok: true,
        student: {
          name: student?.name ?? '',
          avatarUrl: student?.avatarUrl ?? null,
        },
        balance: newBalance,
        nearExpiry,
      };
    });

    return Response.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ERROR';
    const knownReasons = [
      'MEMBERSHIP_INACTIVE',
      'NO_CREDITS',
      'NO_ACTIVE_CLASS',
    ];
    if (knownReasons.includes(message)) {
      return Response.json({ ok: false, reason: message });
    }
    return Response.json({ ok: false, reason: 'ERROR' }, { status: 500 });
  }
}
