import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../lib/db.js';
import { getPlanStatus } from '../lib/enrollment.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { invalidatePayouts } from '../lib/payouts.js';
import { parseBody } from '../lib/request.js';
import { monthPeriod, parseMonthPeriod } from '../lib/utils/date.js';
import { requireAuth, requireRole } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

// Inscripciones del mes. El admin gestiona las de cualquier alumno; cada alumno
// puede auto-inscribirse vía las rutas /me.
const monthlyAttendanceRoutes = new Hono<{ Variables: AuthVariables }>();

const markSchema = z.object({
	studentId: z.string().min(1, 'El alumno es requerido'),
	classId: z.string().min(1, 'La clase es requerida'),
	period: z.string().optional(), // "YYYY-MM"; por defecto el mes actual
});

const selfEnrollSchema = z.object({
	classId: z.string().min(1, 'La clase es requerida'),
	period: z.string().optional(),
});

// ¿Se puede inscribir una clase más? (o ya estaba inscrita → idempotente)
// Requiere plan ACTIVO (pagado, vigente, no consumido). Ver lib/enrollment.ts.
async function checkCanEnroll(
	studentId: string,
	classId: string,
	period: Date,
): Promise<{ ok: true } | { ok: false; reason: string }> {
	const status = await getPlanStatus(studentId);
	if (!status.active) {
		return {
			ok: false,
			reason: status.needsRenewal
				? 'El plan ya no está activo. Se debe renovar para inscribirse.'
				: 'No hay una mensualidad activa.',
		};
	}
	if (status.allowance === null) return { ok: true };

	const already = await db.monthlyAttendance.findUnique({
		where: { studentId_classId_period: { studentId, classId, period } },
	});
	if (already) return { ok: true };

	const count = await db.monthlyAttendance.count({
		where: { studentId, period },
	});
	if (count >= status.allowance) {
		return {
			ok: false,
			reason: `El plan permite ${status.allowance} ${
				status.allowance === 1 ? 'clase' : 'clases'
			}; ya alcanzó el límite.`,
		};
	}
	return { ok: true };
}

// ── Auto-inscripción del alumno (scoped a sí mismo) ────────────────────────

// GET /monthly-attendance/me?period=YYYY-MM — clases en las que está inscrito.
monthlyAttendanceRoutes.get('/me', requireAuth, async (c) => {
	const user = c.get('user');
	const period = parseMonthPeriod(c.req.query('period'));
	const [rows, status] = await Promise.all([
		db.monthlyAttendance.findMany({
			where: { studentId: user.id, period },
			select: { classId: true },
		}),
		getPlanStatus(user.id),
	]);
	return c.json({
		period,
		enrolledClassIds: rows.map((r) => r.classId),
		active: status.active, // plan pagado y vigente
		allowance: status.allowance, // null = ilimitado, 0 = no puede
		needsRenewal: status.needsRenewal, // venció o usó su clase suelta
		singleClass: status.isSingleClass, // clase suelta → clase ya reservada
		expiresAt: status.expiresAt?.toISOString() ?? null,
	});
});

// POST /monthly-attendance/me — el alumno se inscribe en una clase.
monthlyAttendanceRoutes.post('/me', requireAuth, async (c) => {
	const user = c.get('user');
	const parsed = await parseBody(c, selfEnrollSchema);
	const period = parsed.period
		? parseMonthPeriod(parsed.period)
		: monthPeriod();

	// Las clases privadas (compañía/audición) solo las inscribe el admin.
	const cls = await db.class.findUnique({
		where: { id: parsed.classId },
		select: { isPrivate: true },
	});
	if (!cls) throw notFound('Clase no encontrada.');
	if (cls.isPrivate) {
		throw forbidden(
			'Esta clase es privada; solo el administrador puede inscribirte.',
		);
	}

	const check = await checkCanEnroll(user.id, parsed.classId, period);
	if (!check.ok) throw badRequest('ENROLLMENT_NOT_ALLOWED', check.reason);

	const record = await db.monthlyAttendance.upsert({
		where: {
			studentId_classId_period: {
				studentId: user.id,
				classId: parsed.classId,
				period,
			},
		},
		create: { studentId: user.id, classId: parsed.classId, period },
		update: {},
	});
	invalidatePayouts();
	return c.json({ record }, 201);
});

// DELETE /monthly-attendance/me — el alumno se desinscribe.
monthlyAttendanceRoutes.delete('/me', requireAuth, async (c) => {
	const user = c.get('user');
	const parsed = await parseBody(c, selfEnrollSchema);
	const period = parsed.period
		? parseMonthPeriod(parsed.period)
		: monthPeriod();

	// Una reserva de clase suelta (sessionDate seteada) no se puede quitar por
	// autoservicio: evita que el alumno cambie la clase/fecha que ya pagó.
	const existing = await db.monthlyAttendance.findUnique({
		where: {
			studentId_classId_period: {
				studentId: user.id,
				classId: parsed.classId,
				period,
			},
		},
		select: { sessionDate: true },
	});
	if (existing?.sessionDate) {
		throw badRequest(
			'SINGLE_CLASS_LOCKED',
			'Tu reserva de clase suelta no se puede cambiar.',
		);
	}

	await db.monthlyAttendance.deleteMany({
		where: { studentId: user.id, classId: parsed.classId, period },
	});
	invalidatePayouts();
	return c.json({ success: true });
});

// GET /monthly-attendance?period=YYYY-MM&classId=&studentId=
// Lista las inscripciones del período.
monthlyAttendanceRoutes.get(
	'/',
	requireRole('ADMIN'),
	async (c) => {
		const period = parseMonthPeriod(c.req.query('period'));
		const classId = c.req.query('classId');
		const studentId = c.req.query('studentId');

		const records = await db.monthlyAttendance.findMany({
			where: {
				period,
				...(classId ? { classId } : {}),
				...(studentId ? { studentId } : {}),
			},
			include: {
				student: { select: { id: true, name: true } },
				class: { select: { id: true, name: true, teacherId: true } },
			},
		});

		return c.json({ period, records });
	},
);

// POST /monthly-attendance — inscribe a un alumno en una clase ese mes.
// Idempotente: una fila por [alumno, clase, mes].
monthlyAttendanceRoutes.post(
	'/',
	requireRole('ADMIN'),
	async (c) => {
		const parsed = await parseBody(c, markSchema);

		const { studentId, classId } = parsed;
		const period = parsed.period
			? parseMonthPeriod(parsed.period)
			: monthPeriod();

		const check = await checkCanEnroll(studentId, classId, period);
		if (!check.ok) throw badRequest('ENROLLMENT_NOT_ALLOWED', check.reason);

		const record = await db.monthlyAttendance.upsert({
			where: {
				studentId_classId_period: { studentId, classId, period },
			},
			create: { studentId, classId, period },
			update: {},
		});

		invalidatePayouts();
		return c.json({ record }, 201);
	},
);

// DELETE /monthly-attendance — quita la inscripción de un alumno a una clase ese mes.
monthlyAttendanceRoutes.delete(
	'/',
	requireRole('ADMIN'),
	async (c) => {
		const parsed = await parseBody(c, markSchema);

		const { studentId, classId } = parsed;
		const period = parsed.period
			? parseMonthPeriod(parsed.period)
			: monthPeriod();

		// Una reserva de clase suelta (sessionDate seteada) no se quita desde acá:
		// es la clase/fecha que el alumno pagó, no una inscripción mensual libre.
		const existing = await db.monthlyAttendance.findUnique({
			where: { studentId_classId_period: { studentId, classId, period } },
			select: { sessionDate: true },
		});
		if (existing?.sessionDate) {
			throw badRequest(
				'SINGLE_CLASS_LOCKED',
				'Esta es una reserva de clase suelta; no se puede quitar la inscripción.',
			);
		}

		await db.monthlyAttendance.deleteMany({
			where: { studentId, classId, period },
		});

		invalidatePayouts();
		return c.json({ success: true });
	},
);

export default monthlyAttendanceRoutes;
