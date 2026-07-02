import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../lib/db.js';
import { badRequest, notFound } from '../lib/errors.js';
import { parseBody } from '../lib/request.js';
import type { Role } from '../lib/roles.js';
import { requireRole } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const usersRoutes = new Hono<{ Variables: AuthVariables }>();

const changeRoleSchema = z.object({
	role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
});

// PATCH /users/:id/role — change user role (admin only)
usersRoutes.patch(
	'/:id/role',
	requireRole('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const { role } = await parseBody(c, changeRoleSchema);

		const target = await db.userProfile.findUnique({
			where: { id },
			select: { id: true, role: true },
		});
		if (!target) throw notFound('Usuario no encontrado.');

		if (target.role === 'ADMIN' && role !== 'ADMIN') {
			const admins = await db.userProfile.count({
				where: { role: 'ADMIN', isActive: true },
			});
			if (admins <= 1) {
				throw badRequest(
					'LAST_ADMIN',
					'No se puede quitar el último administrador.',
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
