import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../lib/db.js';
import { parseJsonBody } from '../lib/request.js';
import type { Role } from '../lib/roles.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoleMiddleware } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const usersRoutes = new Hono<{ Variables: AuthVariables }>();

const changeRoleSchema = z.object({
	role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
});

// PATCH /users/:id/role — change user role (admin only)
usersRoutes.patch(
	'/:id/role',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const body = await parseJsonBody(c);
		const parsed = changeRoleSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 422);
		}

		const { role } = parsed.data;

		const target = await db.userProfile.findUnique({
			where: { id },
			select: { id: true, role: true },
		});
		if (!target) return c.json({ error: 'Usuario no encontrado.' }, 404);

		if (target.role === 'ADMIN' && role !== 'ADMIN') {
			const admins = await db.userProfile.count({
				where: { role: 'ADMIN', isActive: true },
			});
			if (admins <= 1) {
				return c.json(
					{ error: 'No se puede quitar el último administrador.' },
					400,
				);
			}
		}

		const user = await db.userProfile.update({
			where: { id },
			data: { role: role as Role },
			select: { id: true, email: true, name: true, role: true, isActive: true },
		});

		return c.json({ success: true, user });
	},
);

export default usersRoutes;
