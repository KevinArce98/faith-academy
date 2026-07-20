import { Hono } from 'hono';

import { db } from '../lib/db.js';
import { forbidden } from '../lib/errors.js';
import { features } from '../lib/features.js';
import { requireAuth } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const contentRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /content — list all content / video library
contentRoutes.get('/', requireAuth, async (c) => {
	if (!features.lms) {
		throw forbidden('Módulo no disponible.');
	}

	const user = c.get('user');
	const now = new Date();
	const period = new Date(now.getFullYear(), now.getMonth(), 1);
	const classWhere =
		user.role === 'ADMIN'
			? {}
			: user.role === 'TEACHER'
				? { teacherId: user.id }
				: {
						monthlyAttendance: {
							some: { studentId: user.id, period },
						},
					};
	const contentWhere =
		user.role === 'ADMIN'
			? {}
			: { OR: [{ classId: null }, { class: { is: classWhere } }] };

	const [contents, classes] = await Promise.all([
		db.content.findMany({
			where: contentWhere,
			include: { class: { select: { id: true, name: true } } },
			orderBy: { createdAt: 'desc' },
		}),
		db.class.findMany({
			where: { isActive: true, ...classWhere },
			select: { id: true, name: true },
			orderBy: { name: 'asc' },
		}),
	]);

	return c.json({ contents, classes });
});

export default contentRoutes;
