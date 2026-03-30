import type { DbClient } from '../db.js';

// Prisma 7 transaction client - same interface as the regular client
type Tx = DbClient;

/**
 * Promotes the first person on the waitlist (lowest position) to a RESERVED
 * attendance. If the candidate no longer has an active membership or credits,
 * they are removed and the function recurses to try the next candidate.
 */
export async function promoteWaitlist(classId: string, tx: Tx): Promise<void> {
  const next = await tx.classWaitlist.findFirst({
    where: { classId },
    orderBy: { position: 'asc' },
  });

  if (!next) return;

  const now = new Date();
  const activeOrder = await tx.membershipOrder.findFirst({
    where: {
      studentId: next.studentId,
      status: 'ACTIVE',
      expiresAt: { gt: now },
    },
  });

  const latestLedger = await tx.creditLedger.findFirst({
    where: { studentId: next.studentId },
    orderBy: { createdAt: 'desc' },
  });

  const hasCredits = latestLedger && latestLedger.balance > 0;

  if (!activeOrder || !hasCredits) {
    await tx.classWaitlist.delete({ where: { id: next.id } });
    await promoteWaitlist(classId, tx);
    return;
  }

  const newBalance = latestLedger.balance - 1;

  await tx.attendance.create({
    data: {
      classId,
      studentId: next.studentId,
      status: 'RESERVED',
      creditDeducted: true,
    },
  });

  await tx.creditLedger.create({
    data: {
      studentId: next.studentId,
      type: 'CREDIT_DEBIT',
      amount: 1,
      balance: newBalance,
      note: 'Promovido desde lista de espera',
    },
  });

  await tx.classWaitlist.update({
    where: { id: next.id },
    data: { notifiedAt: now },
  });
  await tx.classWaitlist.delete({ where: { id: next.id } });
}
