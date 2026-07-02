import { Hono } from 'hono';

import { db } from '../lib/db.js';
import { forbidden } from '../lib/errors.js';
import { features } from '../lib/features.js';
import { startOfMonth } from '../lib/utils/date.js';
import { sumPrice } from '../lib/utils/money.js';
import { requireRole } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const reportsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /reports
reportsRoutes.get(
	'/',
	requireRole('ADMIN'),
	async (c) => {
		if (!features.reports) {
			throw forbidden('Módulo no disponible.');
		}

		const now = new Date();

		const twelveMonthsAgo = startOfMonth(
			new Date(now.getFullYear(), now.getMonth() - 11, 1),
		);
		const thisMonthStart = startOfMonth(now);
		const prevMonthStart = startOfMonth(
			new Date(now.getFullYear(), now.getMonth() - 1, 1),
		);

		const [
			activeStudents,
			currentMonthOrders,
			prevMonthOrders,
			historicalOrders,
			popularClasses,
			allActivePlanOrders,
			newStudentsCount,
			prevStudentsCount,
			weeklyClasses,
		] = await Promise.all([
			db.userProfile.count({ where: { role: 'STUDENT' } }),
			db.membershipOrder.findMany({
				where: { status: 'ACTIVE', startsAt: { gte: thisMonthStart } },
				include: { plan: { select: { price: true } } },
			}),
			db.membershipOrder.findMany({
				where: {
					status: 'ACTIVE',
					startsAt: { gte: prevMonthStart, lt: thisMonthStart },
				},
				include: { plan: { select: { price: true } } },
			}),
			db.membershipOrder.findMany({
				where: { status: 'ACTIVE', startsAt: { gte: twelveMonthsAgo } },
				include: { plan: { select: { price: true } } },
				orderBy: { startsAt: 'asc' },
			}),
			db.class.findMany({
				include: {
					_count: {
						select: { attendances: { where: { status: 'ATTENDED' } } },
					},
				},
				orderBy: { attendances: { _count: 'desc' } },
				take: 5,
			}),
			// Single query for plan distribution — avoid groupBy + separate planDetails fetch
			db.membershipOrder.findMany({
				where: { status: 'ACTIVE' },
				select: { planId: true, plan: { select: { name: true } } },
			}),
			db.userProfile.count({
				where: { role: 'STUDENT', createdAt: { gte: thisMonthStart } },
			}),
			db.userProfile.count({
				where: {
					role: 'STUDENT',
					createdAt: { gte: prevMonthStart, lt: thisMonthStart },
				},
			}),
			db.class.count({
				where: { startsAt: { gte: thisMonthStart } },
			}),
		]);

		const totalRevenue = sumPrice(currentMonthOrders);
		const prevRevenue = sumPrice(prevMonthOrders);

		// Group plan counts in memory — one query instead of groupBy + findMany
		const planCountMap = new Map<string, { name: string; count: number }>();
		for (const order of allActivePlanOrders) {
			const existing = planCountMap.get(order.planId);
			if (existing) {
				existing.count++;
			} else {
				planCountMap.set(order.planId, { name: order.plan.name, count: 1 });
			}
		}
		const planData = Array.from(planCountMap.values());

		type HistoricalOrder = { startsAt: Date | null; plan: { price: unknown } };

		const monthlyRevenue: { month: string; revenue: number }[] = [];
		for (let i = 11; i >= 0; i--) {
			const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
			const label = new Intl.DateTimeFormat('es-CR', { month: 'short' }).format(
				mStart,
			);
			const rev = (historicalOrders as HistoricalOrder[])
				.filter((o) => {
					const d = o.startsAt ? new Date(o.startsAt) : null;
					return d && d >= mStart && d <= mEnd;
				})
				.reduce((sum, o) => sum + Number(o.plan.price), 0);
			monthlyRevenue.push({ month: label, revenue: rev });
		}

		const revenueChange =
			prevRevenue > 0
				? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
				: 0;
		const newStudentsChange =
			prevStudentsCount > 0
				? Math.round(
						((newStudentsCount - prevStudentsCount) / prevStudentsCount) * 100,
					)
				: 0;
		const avgWeeklyClasses =
			weeklyClasses > 0 ? Number((weeklyClasses / 4).toFixed(1)) : 0;

		type PopularClassRow = {
			name: string;
			maxCapacity: number;
			_count: { attendances: number };
		};

		return c.json({
			stats: {
				totalRevenue,
				revenueChange,
				activeStudents,
				newStudentsCount,
				newStudentsChange,
				renewalRate: 78,
				avgWeeklyClasses,
			},
			monthlyRevenue,
			popularClasses: (popularClasses as PopularClassRow[]).map((cls) => ({
				name: cls.name,
				attended: cls._count.attendances,
				capacity: cls.maxCapacity,
			})),
			planData,
		});
	},
);

export default reportsRoutes;
