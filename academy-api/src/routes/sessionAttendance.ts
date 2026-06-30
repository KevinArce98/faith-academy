import { Hono } from 'hono';
import { z } from 'zod';

import { getCurrentUser } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { parseJsonBody } from '../lib/request.js';
import { monthPeriod } from '../lib/utils/date.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoleMiddleware } from '../middleware/requireRole.js';
import type { AuthContext, AuthVariables } from '../types/auth.js';

// Asistencia REAL del día: el profe pasa lista por fecha. NO afecta el pago
// (eso sale de la inscripción). El profe solo gestiona sus propias clases.
const sessionAttendanceRoutes = new Hono<{ Variables: AuthVariables }>();

async function canManageClass(
	c: AuthContext,
	classId: string,
): Promise<boolean> {
	const user = await getCurrentUser(c);
	if (!user) return false;
	if (user.role !== 'TEACHER') return true; // admin
	const cls = await db.class.findUnique({
		where: { id: classId },
		select: { teacherId: true },
	});
	return !!cls && cls.teacherId === user.id;
}

// "YYYY-MM-DD" → Date a medianoche UTC (para el tipo Date de Postgres).
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
	date: z.string().min(1, 'La fecha es requerida'), // "YYYY-MM-DD"
});

// GET /session-attendance?classId=&date=YYYY-MM-DD
// Devuelve el roster (alumnos inscritos en la clase ese mes) y quién asistió ese día.
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

		const [records, enrolled, paidSubs] = await Promise.all([
			db.sessionAttendance.findMany({
				where: { classId, date },
				select: { studentId: true },
			}),
			db.monthlyAttendance.findMany({
				where: {
					classId,
					period,
					// Mensual (sessionDate null) → todas las sesiones del mes.
					// Clase suelta (sessionDate seteada) → solo su fecha reservada.
					OR: [{ sessionDate: null }, { sessionDate: date }],
				},
				include: { student: { select: { id: true, name: true } } },
			}),
			// Solo alumnos con la mensualidad PAGADA este mes.
			db.monthlySubscription.findMany({
				where: { period, isPaid: true },
				select: { studentId: true },
			}),
		]);

		// Roster = inscritos (la fecha de clase suelta ya se filtró arriba) con pago al día.
		const paidSet = new Set(paidSubs.map((s) => s.studentId));
		const roster = enrolled
			.filter((e) => paidSet.has(e.student.id))
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

// POST /session-attendance — marca que el alumno asistió ese día.
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
		return c.json({ record }, 201);
	},
);

// DELETE /session-attendance — quita la asistencia de ese día.
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
		return c.json({ success: true });
	},
);

export default sessionAttendanceRoutes;
