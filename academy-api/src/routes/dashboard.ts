import { Hono } from 'hono';

import { getCurrentUser, requireRole } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { endOfDay, startOfDay, startOfMonth } from '../lib/utils/date.js';
import { sumPrice } from '../lib/utils/money.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthVariables } from '../types/auth.js';

const dashboardRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /dashboard/student — student dashboard data
dashboardRoutes.get('/student', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user || user.role !== 'STUDENT') {
		return c.json({ error: 'No autorizado' }, 403);
	}

	const now = new Date();

	const [latestLedger, activeOrderData, upcomingAttendances, recentOrders] =
		await Promise.all([
			db.creditLedger.findFirst({
				where: { studentId: user.id },
				orderBy: { createdAt: 'desc' },
			}),
			db.membershipOrder.findFirst({
				where: { studentId: user.id, status: 'ACTIVE' },
				include: { plan: true },
				orderBy: { expiresAt: 'desc' },
			}),
			db.attendance.findMany({
				where: {
					studentId: user.id,
					status: 'RESERVED',
					class: { isActive: true },
				},
				include: {
					class: {
						select: {
							id: true,
							name: true,
							startsAt: true,
							endsAt: true,
							skillLevel: true,
						},
					},
				},
				orderBy: { class: { startsAt: 'asc' } },
				take: 5,
			}),
			db.membershipOrder.findMany({
				where: { studentId: user.id },
				include: { plan: { select: { name: true, price: true } } },
				orderBy: { createdAt: 'desc' },
				take: 5,
			}),
		]);

	const creditBalance = latestLedger?.balance ?? 0;

	const activeOrder = activeOrderData
		? {
				id: activeOrderData.id,
				planName: activeOrderData.plan.name,
				status: activeOrderData.status,
				creditsRemaining: creditBalance,
				expiresAt: activeOrderData.expiresAt?.toISOString() ?? null,
			}
		: null;

	const upcomingClasses = upcomingAttendances.map((a) => ({
		id: a.class.id,
		name: a.class.name,
		startsAt: a.class.startsAt.toISOString(),
		endsAt: a.class.endsAt.toISOString(),
		skillLevel: a.class.skillLevel,
	}));

	const recentPayments = recentOrders.map((o) => ({
		id: o.id,
		planName: o.plan.name,
		status: o.status,
		createdAt: o.createdAt.toISOString(),
		price: Number(o.plan.price),
	}));

	return c.json({
		userName: user.name ?? '',
		creditBalance,
		activeOrder,
		upcomingClasses,
		recentPayments,
	});
});

// GET /dashboard/teacher — teacher-specific dashboard data
dashboardRoutes.get('/teacher', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user || user.role !== 'TEACHER') {
		return c.json({ error: 'No autorizado' }, 403);
	}

	const now = new Date();
	const todayDOW = now.getDay();

	const [allClasses, totalEnrolled] = await Promise.all([
		db.class.findMany({
			where: { teacherId: user.id, isActive: true },
			include: {
				_count: {
					select: {
						attendances: {
							where: { status: { in: ['RESERVED', 'ATTENDED'] } },
						},
					},
				},
			},
			orderBy: { startsAt: 'asc' },
		}),
		db.attendance.count({
			where: {
				class: { teacherId: user.id, isActive: true },
				status: { in: ['RESERVED', 'ATTENDED'] },
			},
		}),
	]);

	const todayClasses = allClasses.filter(
		(cls) => cls.startsAt.getDay() === todayDOW,
	);
	const upcomingClasses = allClasses
		.filter((cls) => cls.startsAt.getDay() !== todayDOW)
		.slice(0, 5);

	return c.json({
		userName: user.name ?? '',
		todayClasses: todayClasses.map((cls) => ({
			id: cls.id,
			name: cls.name,
			startsAt: cls.startsAt.toISOString(),
			endsAt: cls.endsAt.toISOString(),
			attendanceCount: cls._count.attendances,
			maxCapacity: cls.maxCapacity,
		})),
		upcomingClasses: upcomingClasses.map((cls) => ({
			id: cls.id,
			name: cls.name,
			startsAt: cls.startsAt.toISOString(),
			endsAt: cls.endsAt.toISOString(),
			attendanceCount: cls._count.attendances,
			maxCapacity: cls.maxCapacity,
			skillLevel: cls.skillLevel,
		})),
		totalEnrolled,
		totalClasses: todayClasses.length + upcomingClasses.length,
	});
});

// GET /dashboard/admin — admin/teacher dashboard data
dashboardRoutes.get('/admin', authMiddleware, async (c) => {
	let user;
	try {
		user = await requireRole(c, ['ADMIN', 'TEACHER']);
	} catch (error) {
		const status =
			error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
		return c.json({ error: 'No autorizado' }, status);
	}

	const now = new Date();
	const todayStart = startOfDay(now);
	const todayEnd = endOfDay(now);
	const weekStart = new Date(now);
	weekStart.setDate(now.getDate() - 7);
	const in7days = new Date(now);
	in7days.setDate(now.getDate() + 7);
	const thisMonthStart = startOfMonth(now);
	const prevMonthStart = startOfMonth(
		new Date(now.getFullYear(), now.getMonth() - 1, 1),
	);

	const [
		activeStudents,
		pendingOrders,
		expiringOrders,
		todayClasses,
		newStudents,
		currentMonthOrders,
		prevMonthOrders,
	] = await Promise.all([
		db.userProfile.count({ where: { role: 'STUDENT' } }),
		db.membershipOrder.findMany({
			where: { status: 'PENDING_REVIEW' },
			include: {
				student: { select: { id: true, name: true, email: true } },
				plan: { select: { id: true, name: true, price: true } },
			},
			orderBy: { createdAt: 'desc' },
			take: 10,
		}),
		db.membershipOrder.count({
			where: { status: 'ACTIVE', expiresAt: { lte: in7days, gte: now } },
		}),
		db.class.findMany({
			where: { startsAt: { gte: todayStart, lte: todayEnd } },
			include: { _count: { select: { attendances: true } } },
			orderBy: { startsAt: 'asc' },
		}),
		db.userProfile.findMany({
			where: { role: 'STUDENT', createdAt: { gte: weekStart } },
			include: {
				orders: {
					where: { status: 'ACTIVE' },
					include: { plan: { select: { name: true } } },
					take: 1,
				},
			},
			orderBy: { createdAt: 'desc' },
			take: 5,
		}),
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
	]);

	const monthRevenue = sumPrice(currentMonthOrders);
	const prevMonthRevenue = sumPrice(prevMonthOrders);

	const revenueChange =
		prevMonthRevenue > 0
			? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
			: 0;

	return c.json({
		userName: user.name ?? '',
		activeStudents,
		pendingOrders: pendingOrders.map((o) => ({
			id: o.id,
			studentId: o.studentId,
			studentName: o.student?.name ?? '',
			studentEmail: o.student?.email ?? '',
			planName: o.plan?.name ?? '',
			planPrice: Number(o.plan?.price ?? 0),
			status: o.status,
			receiptUrl: o.receiptUrl,
			createdAt: o.createdAt.toISOString(),
		})),
		expiringOrders,
		todayClasses: todayClasses.map((cls) => ({
			id: cls.id,
			name: cls.name,
			startsAt: cls.startsAt.toISOString(),
			endsAt: cls.endsAt.toISOString(),
			attendanceCount: cls._count.attendances,
		})),
		newStudents: newStudents.map((s) => ({
			id: s.id,
			name: s.name,
			email: s.email,
			createdAt: s.createdAt.toISOString(),
			planName: s.orders[0]?.plan?.name ?? null,
		})),
		monthRevenue,
		revenueChange,
	});
});

export default dashboardRoutes;
