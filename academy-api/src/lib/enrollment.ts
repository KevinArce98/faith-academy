import { db } from './db.js';

export type PlanStatus = {
	active: boolean;
	allowance: number | null;
	expiresAt: Date | null;
	needsRenewal: boolean;
	isSingleClass: boolean;
};

export async function getPlanStatus(studentId: string): Promise<PlanStatus> {
	const now = new Date();

	const active = await db.monthlySubscription.findFirst({
		where: {
			studentId,
			isPaid: true,
			expiresAt: { gt: now },
		},
		orderBy: { paidAt: 'desc' },
		select: {
			expiresAt: true,
			plan: { select: { classesPerWeek: true, isSingleClass: true } },
		},
	});

	if (active?.expiresAt) {
		const allowance = active.plan.isSingleClass
			? 1
			: active.plan.classesPerWeek === 0
				? null
				: active.plan.classesPerWeek;
		return {
			active: true,
			allowance,
			expiresAt: active.expiresAt,
			needsRenewal: false,
			isSingleClass: active.plan.isSingleClass,
		};
	}

	const hadPlan = await db.monthlySubscription.count({
		where: { studentId, isPaid: true },
	});
	return {
		active: false,
		allowance: 0,
		expiresAt: null,
		needsRenewal: hadPlan > 0,
		isSingleClass: false,
	};
}
