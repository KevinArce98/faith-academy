'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function approvePayment(orderId: string) {
  const admin = await requireRole(['ADMIN', 'TEACHER']);

  const order = await db.membershipOrder.findUnique({
    where: { id: orderId },
    include: { plan: true },
  });

  if (!order || order.status !== 'PENDING_REVIEW') {
    throw new Error('ORDER_NOT_FOUND_OR_INVALID');
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(
    expiresAt.getMonth() +
      (order.plan.intervalType === 'MONTHLY' ? order.plan.intervalValue : 1)
  );

  const lastEntry = await db.creditLedger.findFirst({
    where:   { studentId: order.studentId },
    orderBy: { createdAt: 'desc' },
  });
  const currentBalance = lastEntry?.balance ?? 0;

  await db.$transaction([
    db.membershipOrder.update({
      where: { id: orderId },
      data: {
        status: 'ACTIVE',
        approvedById: admin.clerkId,
        approvedAt: now,
        startsAt: now,
        expiresAt,
        creditGranted: order.plan.credits,
      },
    }),
    db.creditLedger.create({
      data: {
        studentId: order.studentId,
        orderId: order.id,
        type: 'CREDIT_GRANT',
        amount: order.plan.credits,
        balance: currentBalance + order.plan.credits,
        note: `Aprobado por ${admin.name}`,
      },
    }),
  ]);

  revalidatePath('/payments');
  revalidatePath('/dashboard');
  revalidatePath('/students');
}

export async function rejectPayment(orderId: string, reason?: string) {
  const admin = await requireRole(['ADMIN', 'TEACHER']);

  await db.membershipOrder.update({
    where: { id: orderId },
    data: {
      status: 'REJECTED',
      approvedById: admin.clerkId,
      approvedAt: new Date(),
      notes: reason ?? 'Rechazado por administrador',
    },
  });

  revalidatePath('/payments');
  revalidatePath('/dashboard');
}
