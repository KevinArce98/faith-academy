import { Hono } from 'hono';

import { db } from '../lib/db.js';
import { computePayouts } from '../lib/payouts.js';
import { monthPeriod } from '../lib/utils/date.js';
import { formatOneOff, formatSlots } from '../lib/utils/schedule.js';
import { requireRole } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const dashboardRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /dashboard/student — resumen flat-fee del alumno (mes actual).
dashboardRoutes.get('/student', requireRole('STUDENT'), async (c) => {
	const user = c.get('user');

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
dashboardRoutes.get('/teacher', requireRole('TEACHER'), async (c) => {
	const user = c.get('user');

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
dashboardRoutes.get('/admin', requireRole('ADMIN'), async (c) => {
	const user = c.get('user');

	const now = new Date();
	const period = monthPeriod(now);
	const weekStart = new Date(now);
	weekStart.setDate(now.getDate() - 7);

	const [activeStudents, students, newStudents, payout] = await Promise.all([
		db.userProfile.count({ where: { role: 'STUDENT', isActive: true } }),
		// Alumnos activos + sus mensualidades recientes para calcular el estado
		// de plan por ciclo de aniversario (no por mes calendario).
		db.userProfile.findMany({
			where: { role: 'STUDENT', isActive: true },
			select: {
				id: true,
				name: true,
				avatarUrl: true,
				email: true,
				subscriptions: {
					orderBy: { period: 'desc' },
					take: 12,
					select: {
						id: true,
						planId: true,
						period: true,
						amount: true,
						isPaid: true,
						expiresAt: true,
						plan: { select: { name: true, isSingleClass: true } },
					},
				},
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

	// Cobranza por estado de plan: un alumno está "pendiente" si NO tiene una
	// mensualidad vigente (pagada y no vencida). 'pending' = asignada este mes y
	// sin pagar (se marca pagada); 'expired' = su plan venció (se renueva).
	const periodMs = period.getTime();
	type Pending = {
		subscriptionId: string | null;
		studentId: string;
		studentName: string;
		studentAvatarUrl: string | null;
		studentEmail: string;
		planId: string;
		planName: string;
		amount: number;
		status: 'pending' | 'expired';
	};
	const pendingPayments: Pending[] = [];
	let monthPending = 0;

	for (const s of students) {
		const subs = s.subscriptions;
		const active = subs.find((x) => x.isPaid && x.expiresAt && x.expiresAt > now);
		if (active) continue; // al día

		const currentSub = subs.find((x) => x.period.getTime() === periodMs);
		// La clase suelta es un pago único, no una mensualidad recurrente: no entra
		// en la cobranza mensual.
		if (currentSub && !currentSub.isPaid && !currentSub.plan?.isSingleClass) {
			pendingPayments.push({
				subscriptionId: currentSub.id,
				studentId: s.id,
				studentName: s.name ?? '',
				studentAvatarUrl: s.avatarUrl,
				studentEmail: s.email,
				planId: currentSub.planId,
				planName: currentSub.plan?.name ?? '',
				amount: Number(currentSub.amount),
				status: 'pending',
			});
			monthPending += Number(currentSub.amount);
			continue;
		}

		// Plan vencido: la última mensualidad pagada (ya expirada) → renovar.
		// Las de clase suelta no se "renuevan" (no son recurrentes).
		const lastPaid = subs.find((x) => x.isPaid);
		if (lastPaid && !lastPaid.plan?.isSingleClass) {
			pendingPayments.push({
				subscriptionId: null,
				studentId: s.id,
				studentName: s.name ?? '',
				studentAvatarUrl: s.avatarUrl,
				studentEmail: s.email,
				planId: lastPaid.planId,
				planName: lastPaid.plan?.name ?? '',
				amount: Number(lastPaid.amount),
				status: 'expired',
			});
			monthPending += Number(lastPaid.amount);
		}
		// Sin ninguna mensualidad → no tiene plan asignado; no es cobranza.
	}

	return c.json({
		userName: user.name ?? '',
		activeStudents,
		monthCollected: payout.totals.collected,
		monthPending,
		teacherPayout: payout.totals.allocated,
		pendingCount: pendingPayments.length,
		pendingPayments,
		classStats: payout.classStats.slice(0, 8),
		newStudents: newStudents.map((s) => ({
			id: s.id,
			name: s.name,
			avatarUrl: s.avatarUrl,
			email: s.email,
			createdAt: s.createdAt.toISOString(),
			planName: s.subscriptions[0]?.plan?.name ?? null,
		})),
	});
});

export default dashboardRoutes;
