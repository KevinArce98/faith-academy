import { Hono } from 'hono';
import { z } from 'zod';

import { getCurrentUser, requireRole } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { parseJsonBody } from '../lib/request.js';
import { monthPeriod } from '../lib/utils/date.js';
import { formatOneOff, formatSlots } from '../lib/utils/schedule.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoleMiddleware } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

// Un slot del horario: día de la semana (1=Lun..7=Dom) + hora inicio/fin "HH:mm".
const slotSchema = z.object({
	dayOfWeek: z.number().int().min(1).max(7),
	startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
	endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
});

// Clase recurrente (Ballet, Jazz…) con su profesor y su horario (slots).
const createClassSchema = z.object({
	name: z.string().min(1, 'El nombre es requerido'),
	teacherId: z.string().min(1, 'El profesor es requerido'),
	slots: z.array(slotSchema).optional(),
	skillLevel: z
		.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER'])
		.optional(),
	maxCapacity: z.number().int().nonnegative().optional(),
	description: z.string().optional(),
	isPrivate: z.boolean().optional(),
	// Clase única: fecha puntual "YYYY-MM-DD" (con un solo slot para la hora).
	oneOffDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
		.nullable()
		.optional(),
});

const updateClassSchema = z.object({
	name: z.string().min(1, 'El nombre es requerido').optional(),
	teacherId: z.string().min(1, 'El profesor es requerido').optional(),
	slots: z.array(slotSchema).optional(),
	skillLevel: z
		.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER'])
		.optional(),
	maxCapacity: z.number().int().nonnegative().optional(),
	description: z.string().optional(),
	isPrivate: z.boolean().optional(),
	oneOffDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
		.nullable()
		.optional(),
});

const classesRoutes = new Hono<{ Variables: AuthVariables }>();

// "YYYY-MM-DD" → Date a medianoche UTC (para columnas @db.Date).
function parseDateOnly(s: string): Date {
	return new Date(`${s}T00:00:00.000Z`);
}

classesRoutes.get('/', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	const week = c.req.query('week');
	const where: { startsAt?: { gte: Date; lt: Date } } = {};

	if (week) {
		const weekStart = new Date(week);
		if (!Number.isNaN(weekStart.getTime())) {
			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekStart.getDate() + 7);
			where.startsAt = { gte: weekStart, lt: weekEnd };
		}
	}

	const classes = await db.class.findMany({
		where,
		orderBy: { startsAt: 'asc' },
		include: {
			slots: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
			_count: {
				select: {
					attendances: {
						where: { status: { in: ['RESERVED', 'ATTENDED'] } },
					},
					waitlist: true,
				},
			},
		},
	});

	if (user?.role === 'STUDENT') {
		// Inscripciones del mes (modelo flat-fee) → estado + visibilidad de privadas.
		const period = monthPeriod();
		const classIds = classes.map((cls) => cls.id);
		const enrollments = await db.monthlyAttendance.findMany({
			where: { studentId: user.id, classId: { in: classIds }, period },
			select: { classId: true },
		});
		const enrolledSet = new Set(enrollments.map((e) => e.classId));
		// Las clases privadas (compañía/audición) se ocultan a quien no esté asignado.
		const visible = classes.filter(
			(cls) => !cls.isPrivate || enrolledSet.has(cls.id),
		);
		return c.json({
			classes: visible.map((cls) => ({
				...cls,
				schedule: cls.oneOffDate
					? formatOneOff(cls.oneOffDate, cls.slots)
					: formatSlots(cls.slots),
				isEnrolled: enrolledSet.has(cls.id),
			})),
		});
	}

	return c.json({
		classes: classes.map((cls) => ({
			...cls,
			schedule: formatSlots(cls.slots),
		})),
	});
});

classesRoutes.post(
	'/',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const body = await parseJsonBody(c);
		const parsed = createClassSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		const {
			name,
			teacherId,
			slots,
			skillLevel,
			maxCapacity,
			description,
			isPrivate,
			oneOffDate,
		} = parsed.data;

		// startsAt/endsAt son placeholders del modelo viejo; el horario real va en slots.
		const now = new Date();
		const cls = await db.class.create({
			data: {
				name,
				teacherId,
				skillLevel: skillLevel ?? 'BEGINNER',
				maxCapacity: maxCapacity ?? 0,
				cancelWindowHours: 24,
				creditCost: 1,
				description: description || null,
				isPrivate: isPrivate ?? false,
				oneOffDate: oneOffDate ? parseDateOnly(oneOffDate) : null,
				startsAt: now,
				endsAt: new Date(now.getTime() + 60 * 60 * 1000),
				slots: slots?.length
					? { create: slots.map((s) => ({ ...s })) }
					: undefined,
			},
			include: {
				slots: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
			},
		});

		return c.json({ class: cls }, 201);
	},
);

classesRoutes.put(
	'/:id',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const existingClass = await db.class.findUnique({ where: { id } });
		if (!existingClass) {
			return c.json({ error: 'Clase no encontrada' }, 404);
		}

		const body = await parseJsonBody(c);
		const parsed = updateClassSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		const {
			name,
			teacherId,
			slots,
			skillLevel,
			maxCapacity,
			description,
			isPrivate,
			oneOffDate,
		} = parsed.data;

		const updateData: Record<string, unknown> = {};
		if (name !== undefined) updateData.name = name;
		if (teacherId !== undefined) updateData.teacherId = teacherId;
		if (skillLevel !== undefined) updateData.skillLevel = skillLevel;
		if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity;
		if (description !== undefined) updateData.description = description || null;
		if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
		if (oneOffDate !== undefined)
			updateData.oneOffDate = oneOffDate ? parseDateOnly(oneOffDate) : null;

		const updatedClass = await db.$transaction(async (tx) => {
			// Si vienen slots, se reemplaza el horario completo.
			if (slots !== undefined) {
				await tx.classSlot.deleteMany({ where: { classId: id } });
				if (slots.length) {
					await tx.classSlot.createMany({
						data: slots.map((s) => ({ classId: id, ...s })),
					});
				}
			}
			return tx.class.update({
				where: { id },
				data: updateData,
				include: {
					slots: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
				},
			});
		});

		return c.json({ class: updatedClass });
	},
);

classesRoutes.delete(
	'/:id',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const existingClass = await db.class.findUnique({
			where: { id },
			include: {
				_count: {
					select: { attendances: true, monthlyAttendance: true },
				},
			},
		});

		if (!existingClass) {
			return c.json({ error: 'Clase no encontrada' }, 404);
		}

		if (
			existingClass._count.attendances > 0 ||
			existingClass._count.monthlyAttendance > 0
		) {
			return c.json(
				{
					error:
						'No se puede eliminar una clase con asistencia registrada. Primero elimina los registros.',
				},
				400,
			);
		}

		await db.class.delete({ where: { id } });
		return c.json({ message: 'Clase eliminada exitosamente' });
	},
);

classesRoutes.post('/:id/reserve', authMiddleware, async (c) => {
	let user;
	try {
		user = await requireRole(c, 'STUDENT');
	} catch (error) {
		const status =
			error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
		return c.json({ error: 'No autorizado' }, status);
	}

	const classId = c.req.param('id');

	try {
		const cls = await db.class.findFirst({
			where: { id: classId, isActive: true },
		});
		if (!cls) throw new Error('CLASS_NOT_FOUND');

		const now = new Date();
		const activeOrder = await db.membershipOrder.findFirst({
			where: {
				studentId: user.id,
				status: 'ACTIVE',
				expiresAt: { gt: now },
			},
		});
		if (!activeOrder) throw new Error('NO_ACTIVE_MEMBERSHIP');

		const activeCount = await db.attendance.count({
			where: {
				classId,
				status: { in: ['RESERVED', 'ATTENDED'] },
			},
		});
		if (activeCount >= cls.maxCapacity) throw new Error('CLASS_FULL');

		const existing = await db.attendance.findFirst({
			where: {
				classId,
				studentId: user.id,
				status: { in: ['RESERVED', 'ATTENDED'] },
			},
		});
		if (existing) throw new Error('ALREADY_ENROLLED');

		const latestLedger = await db.creditLedger.findFirst({
			where: { studentId: user.id },
			orderBy: { createdAt: 'desc' },
		});

		const creditCost = cls.creditCost ?? 1;
		if (!latestLedger || latestLedger.balance < creditCost)
			throw new Error('NO_CREDITS');

		const newBalance = latestLedger.balance - creditCost;

		const attendance = await db.attendance.create({
			data: {
				classId,
				studentId: user.id,
				status: 'RESERVED',
				creditDeducted: true,
			},
		});

		await db.creditLedger.create({
			data: {
				studentId: user.id,
				attendanceId: attendance.id,
				type: 'CREDIT_DEBIT',
				amount: creditCost,
				balance: newBalance,
				note: `Reserva clase: ${cls.name}`,
			},
		});

		return c.json(attendance, 201);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'ERROR';
		const statusMap: Record<string, number> = {
			CLASS_NOT_FOUND: 404,
			NO_ACTIVE_MEMBERSHIP: 403,
			CLASS_FULL: 409,
			ALREADY_ENROLLED: 409,
			NO_CREDITS: 402,
		};

		c.status(
			(statusMap[message] ?? 500) as 400 | 401 | 402 | 403 | 404 | 409 | 500,
		);
		return c.json({ error: message });
	}
});

// DELETE /classes/:id/reserve — student cancels their own reservation
classesRoutes.delete('/:id/reserve', authMiddleware, async (c) => {
	let user;
	try {
		user = await requireRole(c, 'STUDENT');
	} catch (error) {
		const status =
			error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
		return c.json({ error: 'No autorizado' }, status);
	}

	const classId = c.req.param('id');
	const cls = await db.class.findFirst({
		where: { id: classId, isActive: true },
	});
	if (!cls) return c.json({ error: 'Clase no encontrada' }, 404);

	const now = new Date();
	if (cls.cancelWindowHours) {
		const hoursUntil =
			(new Date(cls.startsAt).getTime() - now.getTime()) / (1000 * 60 * 60);
		if (hoursUntil < cls.cancelWindowHours) {
			return c.json(
				{
					error: `No se puede cancelar con menos de ${cls.cancelWindowHours} horas de anticipación`,
				},
				409,
			);
		}
	}

	const attendance = await db.attendance.findFirst({
		where: { classId, studentId: user.id, status: 'RESERVED' },
	});
	if (!attendance) return c.json({ error: 'Reserva no encontrada' }, 404);

	const creditCost = cls.creditCost ?? 1;
	const latestLedger = await db.creditLedger.findFirst({
		where: { studentId: user.id },
		orderBy: { createdAt: 'desc' },
	});
	const currentBalance = latestLedger?.balance ?? 0;

	await db.$transaction([
		db.attendance.update({
			where: { id: attendance.id },
			data: { status: 'CANCELLED' },
		}),
		db.creditLedger.create({
			data: {
				studentId: user.id,
				attendanceId: attendance.id,
				type: 'CREDIT_REFUND',
				amount: creditCost,
				balance: currentBalance + creditCost,
				note: `Cancelación reserva: ${cls.name}`,
			},
		}),
	]);

	return c.json({ success: true });
});

// GET /classes/:id/attendances — list enrolled students (teacher/admin)
classesRoutes.get('/:id/attendances', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user || user.role === 'STUDENT') {
		return c.json({ error: 'No autorizado' }, 403);
	}

	const classId = c.req.param('id');
	const cls = await db.class.findUnique({ where: { id: classId } });
	if (!cls) return c.json({ error: 'Clase no encontrada' }, 404);

	if (user.role === 'TEACHER' && cls.teacherId !== user.id) {
		return c.json({ error: 'No autorizado' }, 403);
	}

	const attendances = await db.attendance.findMany({
		where: { classId, status: { in: ['RESERVED', 'ATTENDED'] } },
		include: { student: { select: { id: true, name: true, email: true } } },
		orderBy: { createdAt: 'asc' },
	});

	return c.json({ attendances });
});

// DELETE /classes/:id/attendances/:attendanceId — remove a student (teacher/admin)
classesRoutes.delete(
	'/:id/attendances/:attendanceId',
	authMiddleware,
	async (c) => {
		const user = await getCurrentUser(c);
		if (!user || user.role === 'STUDENT') {
			return c.json({ error: 'No autorizado' }, 403);
		}

		const classId = c.req.param('id');
		const attendanceId = c.req.param('attendanceId');

		const cls = await db.class.findUnique({ where: { id: classId } });
		if (!cls) return c.json({ error: 'Clase no encontrada' }, 404);

		if (user.role === 'TEACHER' && cls.teacherId !== user.id) {
			return c.json({ error: 'No autorizado' }, 403);
		}

		const attendance = await db.attendance.findFirst({
			where: { id: attendanceId, classId },
		});
		if (!attendance) return c.json({ error: 'Inscripción no encontrada' }, 404);
		if (attendance.status !== 'RESERVED') {
			return c.json({ error: 'Solo se pueden eliminar reservas activas' }, 409);
		}

		const creditCost = cls.creditCost ?? 1;
		const latestLedger = await db.creditLedger.findFirst({
			where: { studentId: attendance.studentId },
			orderBy: { createdAt: 'desc' },
		});
		const currentBalance = latestLedger?.balance ?? 0;

		await db.$transaction([
			db.attendance.update({
				where: { id: attendanceId },
				data: { status: 'CANCELLED' },
			}),
			db.creditLedger.create({
				data: {
					studentId: attendance.studentId,
					attendanceId,
					type: 'CREDIT_REFUND',
					amount: creditCost,
					balance: currentBalance + creditCost,
					note: `Removido de clase por instructor: ${cls.name}`,
				},
			}),
		]);

		return c.json({ success: true });
	},
);

classesRoutes.post('/:id/waitlist', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user || user.role !== 'STUDENT') {
		return c.json({ error: 'No autorizado' }, 403);
	}

	const classId = c.req.param('id');

	try {
		const cls = await db.class.findFirst({
			where: { id: classId, isActive: true },
		});
		if (!cls) throw new Error('CLASS_NOT_FOUND');

		const activeCount = await db.attendance.count({
			where: { classId, status: { in: ['RESERVED', 'ATTENDED'] } },
		});
		if (activeCount < cls.maxCapacity) throw new Error('CLASS_NOT_FULL');

		const existingAttendance = await db.attendance.findFirst({
			where: {
				classId,
				studentId: user.id,
				status: { in: ['RESERVED', 'ATTENDED'] },
			},
		});
		if (existingAttendance) throw new Error('ALREADY_ENROLLED');

		const existingWaitlist = await db.classWaitlist.findUnique({
			where: { classId_studentId: { classId, studentId: user.id } },
		});
		if (existingWaitlist) throw new Error('ALREADY_ON_WAITLIST');

		const lastEntry = await db.classWaitlist.findFirst({
			where: { classId },
			orderBy: { position: 'desc' },
		});
		const position = (lastEntry?.position ?? 0) + 1;

		const waitlistEntry = await db.classWaitlist.create({
			data: {
				classId,
				studentId: user.id,
				position,
			},
		});

		return c.json(waitlistEntry, 201);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'ERROR';
		const statusMap: Record<string, number> = {
			CLASS_NOT_FOUND: 404,
			CLASS_NOT_FULL: 409,
			ALREADY_ENROLLED: 409,
			ALREADY_ON_WAITLIST: 409,
		};

		c.status(
			(statusMap[message] ?? 500) as 400 | 401 | 402 | 403 | 404 | 409 | 500,
		);
		return c.json({ error: message });
	}
});

classesRoutes.delete('/:id/waitlist', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user || user.role !== 'STUDENT') {
		return c.json({ error: 'No autorizado' }, 403);
	}

	const classId = c.req.param('id');

	const entry = await db.classWaitlist.findUnique({
		where: { classId_studentId: { classId, studentId: user.id } },
	});

	if (!entry) {
		return c.json({ error: 'WAITLIST_ENTRY_NOT_FOUND' }, 404);
	}

	await db.classWaitlist.delete({
		where: { classId_studentId: { classId, studentId: user.id } },
	});

	return c.json({ removed: true });
});

export default classesRoutes;
