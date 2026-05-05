import { Hono } from 'hono';
import { z } from 'zod';

import { createManagedUser } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { parseJsonBody } from '../lib/request.js';
import type { Role } from '../lib/roles.js';
import { getTeachersWithClasses } from '../lib/teachers.js';
import { generateTempPassword } from '../lib/utils/password.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoleMiddleware } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const teachersRoutes = new Hono<{ Variables: AuthVariables }>();

const createTeacherSchema = z.object({
	name: z.string().min(1, 'El nombre es requerido'),
	email: z.email('Email inválido'),
});

const updateTeacherSchema = z.object({
	isActive: z.boolean().optional(),
	role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
	name: z.string().optional(),
});

// GET /teachers
teachersRoutes.get(
	'/',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const teachers = await getTeachersWithClasses();
		return c.json(teachers);
	},
);

// POST /teachers — create a new teacher
teachersRoutes.post(
	'/',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const body = await parseJsonBody(c);
		const parsed = createTeacherSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 422);
		}

		const { name, email } = parsed.data;
		const tempPassword = generateTempPassword();

		try {
			const userProfile = await createManagedUser({
				email,
				name,
				role: 'TEACHER',
				tempPassword,
			});
			return c.json(
				{ success: true, userId: userProfile.id, tempPassword },
				201,
			);
		} catch (err) {
			const message =
				err instanceof Error && err.message.includes('Unique')
					? 'El correo ya está registrado.'
					: 'Error al crear el profesor.';
			return c.json({ error: message }, 400);
		}
	},
);

// PATCH /teachers/:id — update teacher (isActive, role, name)
teachersRoutes.patch(
	'/:id',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const body = await parseJsonBody(c);
		const parsed = updateTeacherSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 422);
		}

		const { isActive, role, name } = parsed.data;

		const teacher = await db.userProfile.findFirst({
			where: { id, role: 'TEACHER' },
		});
		if (!teacher) {
			return c.json({ error: 'Profesor no encontrado.' }, 404);
		}

		if (isActive === false) {
			const activeClasses = await db.class.count({
				where: { teacherId: teacher.id, isActive: true },
			});
			if (activeClasses > 0) {
				return c.json(
					{
						error: `No se puede desactivar. El profesor tiene ${activeClasses} clase(s) activa(s). Reasigna las clases primero.`,
					},
					400,
				);
			}
		}

		const data: { isActive?: boolean; role?: Role; name?: string } = {};
		if (typeof isActive === 'boolean') data.isActive = isActive;
		if (role) data.role = role as Role;

		if (typeof name === 'string') {
			const trimmed = name.replace(/\s+/g, ' ').trim();
			if (trimmed && trimmed !== teacher.name) {
				data.name = trimmed;
			}
		}

		if (!Object.keys(data).length) {
			return c.json({ error: 'No hay cambios para aplicar.' }, 400);
		}

		const updated = await db.userProfile.update({ where: { id }, data });

		return c.json(updated);
	},
);

// DELETE /teachers/:id
teachersRoutes.delete(
	'/:id',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const teacher = await db.userProfile.findFirst({
			where: { id, role: 'TEACHER' },
		});
		if (!teacher) {
			return c.json({ error: 'Profesor no encontrado.' }, 404);
		}

		const activeClasses = await db.class.count({
			where: { teacherId: teacher.id, isActive: true },
		});
		if (activeClasses > 0) {
			return c.json(
				{
					error: `No se puede eliminar. Tiene ${activeClasses} clase(s) activa(s).`,
				},
				400,
			);
		}

		await db.userProfile.delete({ where: { id } });
		return c.json({ success: true });
	},
);

export default teachersRoutes;
