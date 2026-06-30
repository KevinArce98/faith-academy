import { Hono } from 'hono';

import { getCurrentUser, requireRole } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { computePayouts } from '../lib/payouts.js';
import { monthPeriod } from '../lib/utils/date.js';
import { formatOneOff, formatSlots } from '../lib/utils/schedule.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthVariables } from '../types/auth.js';

const dashboardRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /dashboard/student — resumen flat-fee del alumno (mes actual).
dashboardRoutes.get('/student', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user || user.role !== 'STUDENT') {
		return c.json({ error: 'No autorizado' }, 403);
	}

	const now = new Date();
	const period = monthPeriod(now);

	const [activeSub, latestSub, lastPaid, attended] = await Promise.all([
		// Mensualidad vigente (pagada y no vencida).
		db.monthlySubscription.findFirst({
			where: { studentId: user.id, isPaid: true, expiresAt: { gt: now } },
			orderBy: { paidAt: 'desc' },
			include: { plan: { select: { name: true } } },
		}),
		// Última mensualidad registrada (para mostrar el plan aunque esté vencido).
		db.monthlySubscription.findFirst({
			where: { studentId: user.id },
			orderBy: { period: 'desc' },
			include: { plan: { select: { name: true } } },
		}),
		// Última pagada con vencimiento (para saber si venció).
		db.monthlySubscription.findFirst({
			where: { studentId: user.id, isPaid: true, expiresAt: { not: null } },
			orderBy: { expiresAt: 'desc' },
			select: { expiresAt: true },
		}),
		db.monthlyAttendance.findMany({
			where: { studentId: user.id, period },
			include: { class: { select: { id: true, name: true } } },
		}),
	]);

	const planActive = !!activeSub;
	const planExpired =
		!planActive && !!lastPaid?.expiresAt && lastPaid.expiresAt <= now;
	const displaySub = activeSub ?? latestSub;

	return c.json({
		userName: user.name ?? '',
		enrollmentFee:
			user.enrollmentFee != null ? Number(user.enrollmentFee) : null,
		subscription: displaySub
			? {
					planName: displaySub.plan.name,
					amount: Number(displaySub.amount),
					isPaid: displaySub.isPaid,
				}
			: null,
		planActive,
		planExpired,
		expiresAt: (activeSub?.expiresAt ?? lastPaid?.expiresAt ?? null)?.toISOString() ?? null,
		classesThisMonth: attended.map((a) => ({
			id: a.class.id,
			name: a.class.name,
		})),
	});
});

// "HH:mm" → minutos del día.
function slotMins(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + (m ?? 0);
}

// GET /dashboard/teacher — datos operativos del profe (sin finanzas de la academia).
// Solo lo suyo: sus clases, alumnos inscritos, horas dadas y asistencia.
dashboardRoutes.get('/teacher', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user || user.role !== 'TEACHER') {
		return c.json({ error: 'No autorizado' }, 403);
	}

	const period = monthPeriod();
	const nextMonthStart = new Date(
		Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1),
	);

	const [classes, attendanceCounts, sessionRows] = await Promise.all([
		db.class.findMany({
			where: { teacherId: user.id, isActive: true },
			select: {
				id: true,
				name: true,
				skillLevel: true,
				oneOffDate: true,
				slots: {
					select: { dayOfWeek: true, startTime: true, endTime: true },
					orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
				},
			},
			orderBy: { name: 'asc' },
		}),
		db.monthlyAttendance.groupBy({
			by: ['classId'],
			where: { period, class: { teacherId: user.id } },
			_count: { _all: true },
		}),
		// Asistencia real de sus clases este mes (para sesiones dadas + promedio).
		db.sessionAttendance.findMany({
			where: {
				date: { gte: period, lt: nextMonthStart },
				class: { teacherId: user.id },
			},
			select: { classId: true, date: true },
		}),
	]);

	const countByClass = new Map(
		attendanceCounts.map((a) => [a.classId, a._count._all]),
	);

	// Por clase: fechas distintas (sesiones dadas) y total de asistencias.
	const sessionsByClass = new Map<string, Set<string>>();
	const presentByClass = new Map<string, number>();
	for (const row of sessionRows) {
		const key = row.date.toISOString().slice(0, 10);
		const set = sessionsByClass.get(row.classId) ?? new Set<string>();
		set.add(key);
		sessionsByClass.set(row.classId, set);
		presentByClass.set(row.classId, (presentByClass.get(row.classId) ?? 0) + 1);
	}

	let totalMinutes = 0;
	let totalStudents = 0;

	const classesOut = classes.map((cls) => {
		const enrolled = countByClass.get(cls.id) ?? 0;
		totalStudents += enrolled;

		const sessionsGiven = sessionsByClass.get(cls.id)?.size ?? 0;
		const present = presentByClass.get(cls.id) ?? 0;
		const avgAttendance =
			sessionsGiven > 0 ? Math.round(present / sessionsGiven) : 0;

		// Duración promedio del slot (min) para acumular horas trabajadas.
		const durations = cls.slots
			.map((s) => slotMins(s.endTime) - slotMins(s.startTime))
			.filter((d) => d > 0);
		const avgDuration = durations.length
			? durations.reduce((a, b) => a + b, 0) / durations.length
			: 60;
		totalMinutes += sessionsGiven * avgDuration;

		return {
			id: cls.id,
			name: cls.name,
			skillLevel: cls.skillLevel,
			oneOffDate: cls.oneOffDate
				? cls.oneOffDate.toISOString().slice(0, 10)
				: null,
			schedule: cls.oneOffDate
				? formatOneOff(cls.oneOffDate, cls.slots)
				: formatSlots(cls.slots),
			slots: cls.slots,
			students: enrolled,
			sessionsGiven,
			avgAttendance,
		};
	});

	return c.json({
		userName: user.name ?? '',
		totalClasses: classes.length,
		totalStudents,
		hoursThisMonth: Math.round((totalMinutes / 60) * 10) / 10,
		classes: classesOut,
	});
});

// GET /dashboard/admin — resumen flat-fee de la academia (mes actual).
// Solo ADMIN: expone finanzas de toda la academia y datos de todos los alumnos.
dashboardRoutes.get('/admin', authMiddleware, async (c) => {
	let user;
	try {
		user = await requireRole(c, 'ADMIN');
	} catch (error) {
		const status =
			error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
		return c.json({ error: 'No autorizado' }, status);
	}

	const now = new Date();
	const period = monthPeriod(now);
	const weekStart = new Date(now);
	weekStart.setDate(now.getDate() - 7);

	const [activeStudents, subs, newStudents, payout] = await Promise.all([
		db.userProfile.count({ where: { role: 'STUDENT', isActive: true } }),
		db.monthlySubscription.findMany({
			where: { period },
			include: {
				student: { select: { id: true, name: true, email: true } },
				plan: { select: { name: true } },
			},
		}),
		db.userProfile.findMany({
			where: { role: 'STUDENT', createdAt: { gte: weekStart } },
			include: {
				subscriptions: {
					orderBy: { period: 'desc' },
					take: 1,
					include: { plan: { select: { name: true } } },
				},
			},
			orderBy: { createdAt: 'desc' },
			take: 5,
		}),
		computePayouts(period),
	]);

	const pendingPayments = subs
		.filter((s) => !s.isPaid)
		.map((s) => ({
			subscriptionId: s.id,
			studentId: s.studentId,
			studentName: s.student?.name ?? '',
			studentEmail: s.student?.email ?? '',
			planName: s.plan?.name ?? '',
			amount: Number(s.amount),
		}));

	return c.json({
		userName: user.name ?? '',
		activeStudents,
		monthCollected: payout.totals.collected,
		monthPending: payout.totals.pending,
		teacherPayout: payout.totals.allocated,
		pendingCount: pendingPayments.length,
		pendingPayments,
		classStats: payout.classStats.slice(0, 8),
		newStudents: newStudents.map((s) => ({
			id: s.id,
			name: s.name,
			email: s.email,
			createdAt: s.createdAt.toISOString(),
			planName: s.subscriptions[0]?.plan?.name ?? null,
		})),
	});
});

export default dashboardRoutes;
