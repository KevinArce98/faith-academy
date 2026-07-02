import { Hono } from 'hono';

import { db } from '../lib/db.js';
import { badRequest, notFound } from '../lib/errors.js';
import { notify } from '../lib/push.js';
import { parseBody } from '../lib/request.js';
import { monthPeriod } from '../lib/utils/date.js';
import { formatOneOff, formatSlots } from '../lib/utils/schedule.js';
import {
	createClassSchema,
	updateClassSchema,
} from '../lib/validations/classes.js';
import { requireAuth, requireRole } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const classesRoutes = new Hono<{ Variables: AuthVariables }>();

// "YYYY-MM-DD" → Date a medianoche UTC (para columnas @db.Date).
function parseDateOnly(s: string): Date {
	return new Date(`${s}T00:00:00.000Z`);
}

classesRoutes.get('/', requireAuth, async (c) => {
	const user = c.get('user');
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
				},
			},
		},
	});

	if (user.role === 'STUDENT') {
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

classesRoutes.post('/', requireRole('ADMIN'), async (c) => {
	const parsed = await parseBody(c, createClassSchema);
	const {
		name,
		teacherId,
		slots,
		skillLevel,
		maxCapacity,
		description,
		isPrivate,
		oneOffDate,
	} = parsed;

	// startsAt/endsAt son placeholders del modelo viejo; el horario real va en slots.
	const now = new Date();
	const cls = await db.class.create({
		data: {
			name,
			teacherId,
			skillLevel: skillLevel ?? 'BEGINNER',
			maxCapacity: maxCapacity ?? 0,
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
});

classesRoutes.put('/:id', requireRole('ADMIN'), async (c) => {
	const id = c.req.param('id');
	const existingClass = await db.class.findUnique({ where: { id } });
	if (!existingClass) throw notFound('Clase no encontrada.');

	const parsed = await parseBody(c, updateClassSchema);
	const {
		name,
		teacherId,
		slots,
		skillLevel,
		maxCapacity,
		description,
		isPrivate,
		oneOffDate,
	} = parsed;

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

	// Si cambió el horario o el profesor, avisar a los alumnos inscritos este mes.
	const scheduleChanged =
		slots !== undefined || oneOffDate !== undefined || teacherId !== undefined;
	if (scheduleChanged) {
		const enrolled = await db.monthlyAttendance.findMany({
			where: { classId: id, period: monthPeriod() },
			select: { studentId: true },
		});
		if (enrolled.length > 0) {
			// Fire-and-forget: notify() nunca lanza y no debe frenar la respuesta.
			void notify(
				enrolled.map((e) => e.studentId),
				{
					type: 'CLASS_CHANGED',
					title: 'Cambio en tu clase',
					body: `Se actualizó "${updatedClass.name}". Revisa el nuevo horario.`,
					data: { screen: 'my-classes' },
				},
			);
		}
	}

	return c.json({ class: updatedClass });
});

classesRoutes.delete('/:id', requireRole('ADMIN'), async (c) => {
	const id = c.req.param('id');
	const existingClass = await db.class.findUnique({
		where: { id },
		include: {
			_count: {
				select: { attendances: true, monthlyAttendance: true },
			},
		},
	});

	if (!existingClass) throw notFound('Clase no encontrada.');

	if (
		existingClass._count.attendances > 0 ||
		existingClass._count.monthlyAttendance > 0
	) {
		throw badRequest(
			'CLASS_HAS_ATTENDANCE',
			'No se puede eliminar una clase con asistencia registrada. Primero elimina los registros.',
		);
	}

	await db.class.delete({ where: { id } });
	return c.json({ message: 'Clase eliminada exitosamente' });
});

export default classesRoutes;
