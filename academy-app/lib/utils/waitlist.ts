import { PrismaClient } from '@/lib/generated/prisma/client';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Promotes the first person on the waitlist (lowest position) to a RESERVED
 * attendance. If the candidate no longer has an active membership or credits,
 * they are removed and the function recurses to try the next candidate.
 */
export async function promoteWaitlist(
  classId: string,
  tx: Tx
): Promise<void> {
  // Find the next candidate (lowest position)
  const next = await tx.classWaitlist.findFirst({
    where: { classId },
    orderBy: { position: 'asc' },
  });

  if (!next) return;

  // Verify the candidate still has an active membership with credits
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
    // Not eligible — remove from waitlist and try the next person
    await tx.classWaitlist.delete({ where: { id: next.id } });
    await promoteWaitlist(classId, tx);
    return;
  }

  const newBalance = latestLedger.balance - 1;

  // Create attendance
  await tx.attendance.create({
    data: {
      classId,
      studentId: next.studentId,
      status: 'RESERVED',
      creditDeducted: true,
    },
  });

  // Debit one credit
  await tx.creditLedger.create({
    data: {
      studentId: next.studentId,
      type: 'CREDIT_DEBIT',
      amount: 1,
      balance: newBalance,
      note: 'Promovido desde lista de espera',
    },
  });

  // Mark notifiedAt and remove from waitlist
  await tx.classWaitlist.update({
    where: { id: next.id },
    data: { notifiedAt: now },
  });
  await tx.classWaitlist.delete({ where: { id: next.id } });
}
