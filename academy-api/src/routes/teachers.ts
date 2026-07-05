import { Hono } from 'hono';
import { z } from 'zod';

import { createManagedUser } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { badRequest, notFound } from '../lib/errors.js';
import { Prisma } from '../lib/generated/prisma/client.js';
import { revokeAllForUser } from '../lib/refreshTokens.js';
import { parseBody } from '../lib/request.js';
import type { Role } from '../lib/roles.js';
import { getTeachersWithClasses } from '../lib/teachers.js';
import { generateTempPassword } from '../lib/utils/password.js';
import { requireRole } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const teachersRoutes = new Hono<{ Variables: AuthVariables }>();

const createTeacherSchema = z.object({
	name: z.string().min(1, 'El nombre es requerido'),
	email: z.email('Email inválido'),
	hourlyRate: z.number().nonnegative('El costo por hora no puede ser negativo').optional(),
});

const updateTeacherSchema = z.object({
	isActive: z.boolean().optional(),
	role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
	name: z.string().optional(),
	hourlyRate: z
		.number()
		.nonnegative('El costo por hora no puede ser negativo')
		.nullable()
		.optional(),
});

// GET /teachers
teachersRoutes.get('/', requireRole('ADMIN'), async (c) => {
	const teachers = await getTeachersWithClasses();
	return c.json(teachers);
});

// GET /teachers/assignable — usuarios que pueden impartir una clase
// (profesores + admins, ya que un admin también puede dar clases).
// Lo leen ADMIN (asignar) y TEACHER/STUDENT (ver el profe de cada clase).
// Solo expone id/name/role — sin email ni tarifa.
teachersRoutes.get(
	'/assignable',
	requireRole('ADMIN', 'TEACHER', 'STUDENT'),
	async (c) => {
		const teachers = await db.userProfile.findMany({
			where: { role: { in: ['ADMIN', 'TEACHER'] }, isActive: true },
			select: { id: true, name: true, role: true },
			orderBy: { name: 'asc' },
		});
		return c.json({ teachers });
	},
);

// POST /teachers — create a new teacher
teachersRoutes.post('/', requireRole('ADMIN'), async (c) => {
	const { name, email, hourlyRate } = await parseBody(c, createTeacherSchema);
	const tempPassword = generateTempPassword();

	try {
		const userProfile = await createManagedUser({
			email,
			name,
			role: 'TEACHER',
			tempPassword,
			hourlyRate,
		});
		return c.json({ success: true, userId: userProfile.id, tempPassword }, 201);
	} catch (err) {
		if (
			err instanceof Prisma.PrismaClientKnownRequestError &&
			err.code === 'P2002'
		) {
			throw badRequest('EMAIL_TAKEN', 'El correo ya está registrado.');
		}
		throw err;
	}
});

// PATCH /teachers/:id — update teacher (isActive, role, name)
teachersRoutes.patch(
	'/:id',
	requireRole('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const parsed = await parseBody(c, updateTeacherSchema);

		const { isActive, role, name, hourlyRate } = parsed;

		const teacher = await db.userProfile.findFirst({
			where: { id, role: 'TEACHER' },
		});
		if (!teacher) throw notFound('Profesor no encontrado.');

		if (isActive === false) {
			const activeClasses = await db.class.count({
				where: { teacherId: teacher.id, isActive: true },
			});
			if (activeClasses > 0) {
				throw badRequest(
					'TEACHER_HAS_CLASSES',
					`No se puede desactivar. El profesor tiene ${activeClasses} clase(s) activa(s). Reasigna las clases primero.`,
				);
			}
		}

		const data: {
			isActive?: boolean;
			role?: Role;
			name?: string;
			hourlyRate?: number | null;
		} = {};
		if (typeof isActive === 'boolean') data.isActive = isActive;
		if (role) data.role = role as Role;
		if (hourlyRate !== undefined) data.hourlyRate = hourlyRate;

		if (typeof name === 'string') {
			const trimmed = name.replace(/\s+/g, ' ').trim();
			if (trimmed && trimmed !== teacher.name) {
				data.name = trimmed;
			}
		}

		if (!Object.keys(data).length) {
			throw badRequest('NO_CHANGES', 'No hay cambios para aplicar.');
		}

		const updated = await db.userProfile.update({
			where: { id },
			data,
			select: {
				id: true,
				email: true,
				name: true,
				avatarUrl: true,
				role: true,
				isActive: true,
				hourlyRate: true,
			},
		});

		// Desactivar un profesor cierra todas sus sesiones activas.
		if (isActive === false) {
			await revokeAllForUser(id);
		}

		return c.json(updated);
	},
);

// DELETE /teachers/:id
teachersRoutes.delete('/:id', requireRole('ADMIN'), async (c) => {
	const id = c.req.param('id');
	const teacher = await db.userProfile.findFirst({
		where: { id, role: 'TEACHER' },
	});
	if (!teacher) throw notFound('Profesor no encontrado.');

	const activeClasses = await db.class.count({
		where: { teacherId: teacher.id, isActive: true },
	});
	if (activeClasses > 0) {
		throw badRequest(
			'TEACHER_HAS_CLASSES',
			`No se puede eliminar. Tiene ${activeClasses} clase(s) activa(s).`,
		);
	}

	await db.userProfile.delete({ where: { id } });
	return c.json({ success: true });
});

export default teachersRoutes;
