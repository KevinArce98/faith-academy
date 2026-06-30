import { Hono } from 'hono';
import { z } from 'zod';

import { getCurrentUser } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { invalidatePayouts } from '../lib/payouts.js';
import { parseJsonBody } from '../lib/request.js';
import { monthPeriod } from '../lib/utils/date.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoleMiddleware } from '../middleware/requireRole.js';
import type { AuthContext, AuthVariables } from '../types/auth.js';

const sessionAttendanceRoutes = new Hono<{ Variables: AuthVariables }>();

async function canManageClass(
	c: AuthContext,
	classId: string,
): Promise<boolean> {
	const user = await getCurrentUser(c);
	if (!user) return false;
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
	authMiddleware,
	requireRoleMiddleware(['ADMIN', 'TEACHER']),
	async (c) => {
		const classId = c.req.query('classId');
		if (!classId) return c.json({ error: 'classId requerido' }, 400);
		if (!(await canManageClass(c, classId))) {
			return c.json({ error: 'Solo puedes gestionar tus clases.' }, 403);
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
	authMiddleware,
	requireRoleMiddleware(['ADMIN', 'TEACHER']),
	async (c) => {
		const parsed = markSchema.safeParse(await parseJsonBody(c));
		if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 422);
		const { studentId, classId } = parsed.data;
		if (!(await canManageClass(c, classId))) {
			return c.json({ error: 'Solo puedes gestionar tus clases.' }, 403);
		}
		const date = parseDate(parsed.data.date);
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
	authMiddleware,
	requireRoleMiddleware(['ADMIN', 'TEACHER']),
	async (c) => {
		const parsed = markSchema.safeParse(await parseJsonBody(c));
		if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 422);
		const { studentId, classId } = parsed.data;
		if (!(await canManageClass(c, classId))) {
			return c.json({ error: 'Solo puedes gestionar tus clases.' }, 403);
		}
		const date = parseDate(parsed.data.date);
		await db.sessionAttendance.deleteMany({
			where: { classId, studentId, date },
		});
		invalidatePayouts();
		return c.json({ success: true });
	},
);

export default sessionAttendanceRoutes;
