import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../lib/db.js';
import { badRequest, forbidden } from '../lib/errors.js';
import type { UserProfileModel } from '../lib/generated/prisma/models.js';
import { invalidatePayouts } from '../lib/payouts.js';
import { parseBody } from '../lib/request.js';
import { monthPeriod } from '../lib/utils/date.js';
import { requireRole } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const sessionAttendanceRoutes = new Hono<{ Variables: AuthVariables }>();

async function canManageClass(
	user: UserProfileModel,
	classId: string,
): Promise<boolean> {
	if (user.role !== 'TEACHER') return true;
	const cls = await db.class.findUnique({
		where: { id: classId },
		select: { teacherId: true },
	});
	return !!cls && cls.teacherId === user.id;
}

function parseDate(s?: string): Date {
	if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
		return new Date(`${s}T00:00:00.000Z`);
	}
	const d = new Date();
	return new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
	);
}

const markSchema = z.object({
	studentId: z.string().min(1, 'El alumno es requerido'),
	classId: z.string().min(1, 'La clase es requerida'),
	date: z.string().min(1, 'La fecha es requerida'),
});

sessionAttendanceRoutes.get(
	'/',
	requireRole('ADMIN', 'TEACHER'),
	async (c) => {
		const classId = c.req.query('classId');
		if (!classId) throw badRequest('MISSING_CLASS_ID', 'classId requerido.');
		if (!(await canManageClass(c.get('user'), classId))) {
			throw forbidden('Solo puedes gestionar tus clases.');
		}
		const date = parseDate(c.req.query('date'));
		const period = monthPeriod(date);

		const [records, enrolled, activeSubs] = await Promise.all([
			db.sessionAttendance.findMany({
				where: { classId, date },
				select: { studentId: true },
			}),
			db.monthlyAttendance.findMany({
				where: {
					classId,
					period,
					OR: [{ sessionDate: null }, { sessionDate: date }],
				},
				include: { student: { select: { id: true, name: true } } },
			}),
			db.monthlySubscription.findMany({
				where: { isPaid: true, expiresAt: { gt: date } },
				select: { studentId: true },
			}),
		]);

		const activeSet = new Set(activeSubs.map((s) => s.studentId));
		const roster = enrolled
			.filter((e) => activeSet.has(e.student.id))
			.map((e) => ({ id: e.student.id, name: e.student.name }));
		const rosterIds = new Set(roster.map((r) => r.id));

		return c.json({
			date,
			present: records
				.map((r) => r.studentId)
				.filter((id) => rosterIds.has(id)),
			roster,
		});
	},
);

sessionAttendanceRoutes.post(
	'/',
	requireRole('ADMIN', 'TEACHER'),
	async (c) => {
		const parsed = await parseBody(c, markSchema);
		const { studentId, classId } = parsed;
		if (!(await canManageClass(c.get('user'), classId))) {
			throw forbidden('Solo puedes gestionar tus clases.');
		}
		const date = parseDate(parsed.date);
		const record = await db.sessionAttendance.upsert({
			where: { classId_studentId_date: { classId, studentId, date } },
			create: { classId, studentId, date },
			update: {},
		});
		invalidatePayouts();
		return c.json({ record }, 201);
	},
);

sessionAttendanceRoutes.delete(
	'/',
	requireRole('ADMIN', 'TEACHER'),
	async (c) => {
		const parsed = await parseBody(c, markSchema);
		const { studentId, classId } = parsed;
		if (!(await canManageClass(c.get('user'), classId))) {
			throw forbidden('Solo puedes gestionar tus clases.');
		}
		const date = parseDate(parsed.date);
		await db.sessionAttendance.deleteMany({
			where: { classId, studentId, date },
		});
		invalidatePayouts();
		return c.json({ success: true });
	},
);

export default sessionAttendanceRoutes;
