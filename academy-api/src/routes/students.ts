import { Hono } from 'hono';

import { db } from '../lib/db.js';
import { notFound } from '../lib/errors.js';
import { parseBody } from '../lib/request.js';
import { monthPeriod } from '../lib/utils/date.js';
import {
	createStudentSchema,
	updateStudentSchema,
} from '../lib/validations/students.js';
import { requireRole } from '../middleware/requireRole.js';
import { createStudent, deactivateStudent } from '../services/students.js';
import type { AuthVariables } from '../types/auth.js';

const studentsRoutes = new Hono<{ Variables: AuthVariables }>();

studentsRoutes.get('/', requireRole('ADMIN', 'TEACHER'), async (c) => {
	const students = await db.userProfile.findMany({
		where: { role: 'STUDENT', isActive: true },
		select: {
			id: true,
			name: true,
			avatarUrl: true,
			email: true,
			phone: true,
			role: true,
			createdAt: true,
			isActive: true,
			enrollmentFee: true,
			enrolledAt: true,
			subscriptions: {
				orderBy: { period: 'desc' },
				take: 1,
				select: {
					id: true,
					planId: true,
					period: true,
					amount: true,
					isPaid: true,
					paidAt: true,
					expiresAt: true,
					plan: { select: { id: true, name: true, isPublic: true } },
				},
			},
		},
		orderBy: { createdAt: 'desc' },
	});

	return c.json({ students });
});

studentsRoutes.post('/', requireRole('ADMIN', 'TEACHER'), async (c) => {
	const parsed = await parseBody(c, createStudentSchema);
	const { userId, tempPassword } = await createStudent(parsed);
	return c.json({ success: true, userId, tempPassword }, 201);
});

studentsRoutes.put('/:id', requireRole('ADMIN', 'TEACHER'), async (c) => {
	const parsed = await parseBody(c, updateStudentSchema);

	const id = c.req.param('id');
	const student = await db.userProfile.findFirst({
		where: { id, role: 'STUDENT' },
	});
	if (!student) throw notFound('Alumno no encontrado.');

	const name = parsed.name.replace(/\s+/g, ' ').trim();
	const email = parsed.email.trim().toLowerCase();
	const phone = parsed.phone?.trim() || null;
	const planId = parsed.planId?.trim() || null;
	const { enrollmentFee, enrolledAt } = parsed;

	const updated = await db.$transaction(async (tx) => {
		// Perfil + matrícula.
		const profile = await tx.userProfile.update({
			where: { id: student.id },
			data: {
				name,
				email,
				phone,
				...(enrollmentFee !== undefined
					? { enrollmentFee: enrollmentFee ?? null }
					: {}),
				...(enrolledAt !== undefined
					? { enrolledAt: enrolledAt ? new Date(enrolledAt) : null }
					: {}),
			},
			select: {
				id: true,
				name: true,
				avatarUrl: true,
				email: true,
				phone: true,
				role: true,
				isActive: true,
				enrollmentFee: true,
				enrolledAt: true,
			},
		});

		// Plan asignado → upsert de la mensualidad del mes actual.
		if (planId) {
			const plan = await tx.membershipPlan.findUnique({
				where: { id: planId },
				select: { price: true },
			});
			if (plan) {
				const period = monthPeriod();
				await tx.monthlySubscription.upsert({
					where: { studentId_period: { studentId: student.id, period } },
					create: {
						studentId: student.id,
						planId,
						period,
						amount: plan.price,
						isPaid: false,
					},
					update: { planId, amount: plan.price },
				});
			}
		}

		return profile;
	});

	return c.json({ success: true, student: updated, email });
});

// Baja de alumno: soft delete — el historial financiero y de asistencia se
// conserva. Solo ADMIN.
studentsRoutes.delete('/:id', requireRole('ADMIN'), async (c) => {
	const id = c.req.param('id');
	const student = await db.userProfile.findFirst({
		where: { id, role: 'STUDENT', isActive: true },
		select: { id: true },
	});
	if (!student) throw notFound('Alumno no encontrado.');

	await deactivateStudent(student.id);

	return c.json({ success: true });
});

// GET /students/:id/history — historial del alumno agrupado por mes:
// mensualidad pagada, clases inscritas y asistencias reales de cada mes.
studentsRoutes.get('/:id/history', requireRole('ADMIN', 'TEACHER'), async (c) => {
	const id = c.req.param('id');

	const student = await db.userProfile.findFirst({
		where: { id, role: 'STUDENT' },
		select: {
			id: true,
			name: true,
			avatarUrl: true,
			email: true,
			phone: true,
			isActive: true,
			enrolledAt: true,
			enrollmentFee: true,
		},
	});
	if (!student) throw notFound('Alumno no encontrado.');

	const [subscriptions, enrollments, sessions] = await Promise.all([
		db.monthlySubscription.findMany({
			where: { studentId: id },
			include: { plan: { select: { name: true } } },
			orderBy: { period: 'desc' },
		}),
		db.monthlyAttendance.findMany({
			where: { studentId: id },
			include: { class: { select: { name: true } } },
		}),
		db.sessionAttendance.findMany({
			where: { studentId: id },
			include: { class: { select: { name: true } } },
			orderBy: { date: 'desc' },
		}),
	]);

	// "YYYY-MM" a partir de una fecha (en UTC, como se guardan los períodos).
	const monthKey = (d: Date) =>
		`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

	type Month = {
		period: string;
		subscription: {
			planName: string;
			amount: number;
			isPaid: boolean;
			paidAt: string | null;
			expiresAt: string | null;
		} | null;
		enrolledClasses: { classId: string; className: string }[];
		sessions: { date: string; className: string }[];
	};

	const months = new Map<string, Month>();
	const get = (key: string): Month => {
		let m = months.get(key);
		if (!m) {
			m = { period: key, subscription: null, enrolledClasses: [], sessions: [] };
			months.set(key, m);
		}
		return m;
	};

	for (const s of subscriptions) {
		get(monthKey(s.period)).subscription = {
			planName: s.plan.name,
			amount: Number(s.amount),
			isPaid: s.isPaid,
			paidAt: s.paidAt?.toISOString() ?? null,
			expiresAt: s.expiresAt?.toISOString() ?? null,
		};
	}
	for (const e of enrollments) {
		get(monthKey(e.period)).enrolledClasses.push({
			classId: e.classId,
			className: e.class.name,
		});
	}
	for (const s of sessions) {
		get(monthKey(s.date)).sessions.push({
			date: s.date.toISOString().slice(0, 10),
			className: s.class.name,
		});
	}

	const ordered = [...months.values()].sort((a, b) =>
		a.period < b.period ? 1 : -1,
	);

	return c.json({ student, months: ordered });
});

export default studentsRoutes;
