import type { DbClient } from '../db.js';

type Tx = DbClient;

export async function promoteWaitlist(classId: string, tx: Tx): Promise<void> {
	const MAX_ATTEMPTS = 20;

	for (let i = 0; i < MAX_ATTEMPTS; i++) {
		const next = await tx.classWaitlist.findFirst({
			where: { classId },
			orderBy: { position: 'asc' },
		});

		if (!next) return;

		const now = new Date();
		const [activeOrder, latestLedger] = await Promise.all([
			tx.membershipOrder.findFirst({
				where: {
					studentId: next.studentId,
					status: 'ACTIVE',
					expiresAt: { gt: now },
				},
			}),
			tx.creditLedger.findFirst({
				where: { studentId: next.studentId },
				orderBy: { createdAt: 'desc' },
			}),
		]);

		if (!activeOrder || !latestLedger || latestLedger.balance <= 0) {
			await tx.classWaitlist.delete({ where: { id: next.id } });
			continue;
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
		return;
	}
}
