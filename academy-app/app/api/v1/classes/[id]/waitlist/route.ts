import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'STUDENT') {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id: classId } = await params;

  try {
    const waitlistEntry = await db.$transaction(async (tx) => {
      // 1. Verify the class exists and is full
      const cls = await tx.class.findFirst({
        where: { id: classId, isActive: true },
      });
      if (!cls) {
        throw new Error('CLASS_NOT_FOUND');
      }

      const activeCount = await tx.attendance.count({
        where: {
          classId,
          status: { in: ['RESERVED', 'ATTENDED'] },
        },
      });
      if (activeCount < cls.maxCapacity) {
        throw new Error('CLASS_NOT_FULL');
      }

      // 2. Verify student is not already enrolled
      const existingAttendance = await tx.attendance.findFirst({
        where: {
          classId,
          studentId: user.id,
          status: { in: ['RESERVED', 'ATTENDED'] },
        },
      });
      if (existingAttendance) {
        throw new Error('ALREADY_ENROLLED');
      }

      // 3. Verify student is not already on the waitlist
      const existingWaitlist = await tx.classWaitlist.findUnique({
        where: { classId_studentId: { classId, studentId: user.id } },
      });
      if (existingWaitlist) {
        throw new Error('ALREADY_ON_WAITLIST');
      }

      // 4. Calculate position (max position in this class + 1)
      const lastEntry = await tx.classWaitlist.findFirst({
        where: { classId },
        orderBy: { position: 'desc' },
      });
      const position = (lastEntry?.position ?? 0) + 1;

      // 5. Create ClassWaitlist entry
      return tx.classWaitlist.create({
        data: {
          classId,
          studentId: user.id,
          position,
        },
      });
    });

    return Response.json(waitlistEntry, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ERROR';
    const statusMap: Record<string, number> = {
      CLASS_NOT_FOUND: 404,
      CLASS_NOT_FULL: 409,
      ALREADY_ENROLLED: 409,
      ALREADY_ON_WAITLIST: 409,
    };
    return Response.json(
      { error: message },
      { status: statusMap[message] ?? 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'STUDENT') {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id: classId } = await params;

  try {
    const entry = await db.classWaitlist.findUnique({
      where: { classId_studentId: { classId, studentId: user.id } },
    });

    if (!entry) {
      return Response.json(
        { error: 'WAITLIST_ENTRY_NOT_FOUND' },
        { status: 404 }
      );
    }

    await db.classWaitlist.delete({
      where: { classId_studentId: { classId, studentId: user.id } },
    });

    return Response.json({ removed: true });
  } catch {
    return Response.json({ error: 'ERROR' }, { status: 500 });
  }
}
