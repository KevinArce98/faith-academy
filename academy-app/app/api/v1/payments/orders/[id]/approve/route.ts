import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { addDays, addMonths, addYears } from '@/lib/utils/date';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireRole('ADMIN');
  } catch {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;

  const order = await db.membershipOrder.findUnique({
    where: { id },
    include: { plan: true },
  });

  if (!order) {
    return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  if (order.status !== 'PENDING_REVIEW') {
    return Response.json(
      { error: 'La orden no está en estado PENDING_REVIEW' },
      { status: 409 }
    );
  }

  const now = new Date();
  const { intervalType, intervalValue, credits } = order.plan;

  let expiresAt: Date;
  if (intervalType === 'MONTHLY') {
    expiresAt = addMonths(now, intervalValue);
  } else if (intervalType === 'WEEKLY') {
    expiresAt = addDays(now, intervalValue * 7);
  } else {
    // FIXED_PACKAGE
    expiresAt = addYears(now, 1);
  }

  // Get student's current credit balance
  const lastEntry = await db.creditLedger.findFirst({
    where: { studentId: order.studentId },
    orderBy: { createdAt: 'desc' },
  });
  const currentBalance = lastEntry?.balance ?? 0;

  // Run everything in a transaction
  const [updatedOrder] = await db.$transaction([
    db.membershipOrder.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startsAt: now,
        expiresAt,
        creditGranted: credits,
        approvedById: admin.clerkId,
        approvedAt: now,
      },
    }),
    db.creditLedger.create({
      data: {
        studentId: order.studentId,
        orderId: order.id,
        type: 'CREDIT_GRANT',
        amount: credits,
        balance: currentBalance + credits,
        note: `Plan aprobado: ${order.plan.name}`,
      },
    }),
  ]);

  return Response.json(updatedOrder);
}
