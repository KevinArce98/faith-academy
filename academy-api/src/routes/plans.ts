import { Hono } from 'hono';
import { z } from 'zod';

import { getCurrentUser } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { parseJsonBody } from '../lib/request.js';
import { monthPeriod } from '../lib/utils/date.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoleMiddleware } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const plansRoutes = new Hono<{ Variables: AuthVariables }>();

const planSchema = z.object({
	name: z.string().min(1, 'El nombre es requerido'),
	description: z.string().optional().nullable(),
	price: z.number().nonnegative('El precio debe ser un número válido'),
	// Clases/semana que da el plan (informativo). 0 = ilimitadas/indefinidas.
	classesPerWeek: z
		.number()
		.int()
		.min(0, 'Las clases por semana no pueden ser negativas'),
	// false = plan oculto tipo beca (solo el admin lo asigna, no lo ven los alumnos).
	isPublic: z.boolean().default(true),
	// Plan de una sola clase.
	isSingleClass: z.boolean().default(false),
});

const toggleSchema = z.object({
	isActive: z.boolean(),
});

// GET /plans
plansRoutes.get('/', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	const isAdminUser = user?.role === 'ADMIN';
	const activeOnly = c.req.query('activeOnly') === 'true';

	// Los no-admin solo ven planes activos y públicos (los beca quedan ocultos).
	const plans = await db.membershipPlan.findMany({
		where: isAdminUser
			? activeOnly
				? { isActive: true }
				: undefined
			: { isActive: true, isPublic: true },
		orderBy: { name: 'asc' },
		include: {
			_count: {
				select: {
					subscriptions: { where: { isPaid: true, period: monthPeriod() } },
				},
			},
		},
	});

	return c.json({ plans });
});

// POST /plans
plansRoutes.post(
	'/',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const body = await parseJsonBody(c);
		const parsed = planSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 422);
		}

		const plan = await db.membershipPlan.create({
			data: {
				...parsed.data,
				description: parsed.data.description ?? null,
				isActive: true,
			},
		});

		return c.json({ plan }, 201);
	},
);

// PUT /plans/:id
plansRoutes.put(
	'/:id',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const body = await parseJsonBody(c);
		const parsed = planSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 422);
		}

		const plan = await db.membershipPlan.update({
			where: { id },
			data: { ...parsed.data, description: parsed.data.description ?? null },
		});

		return c.json({ plan });
	},
);

// DELETE /plans/:id
plansRoutes.delete(
	'/:id',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const plan = await db.membershipPlan.findUnique({
			where: { id },
			include: {
				_count: { select: { subscriptions: true } },
			},
		});

		if (!plan) return c.json({ error: 'Plan no encontrado.' }, 404);
		if (plan._count.subscriptions > 0) {
			return c.json(
				{
					error: 'No puedes eliminar un plan que tiene mensualidades registradas.',
				},
				409,
			);
		}

		await db.membershipPlan.delete({ where: { id } });
		return c.json({ success: true });
	},
);

// PATCH /plans/:id/toggle — toggle isActive
plansRoutes.patch(
	'/:id/toggle',
	authMiddleware,
	requireRoleMiddleware('ADMIN'),
	async (c) => {
		const id = c.req.param('id');
		const body = await parseJsonBody(c);
		const parsed = toggleSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 422);
		}

		const plan = await db.membershipPlan.update({
			where: { id },
			data: { isActive: parsed.data.isActive },
		});

		return c.json({ plan });
	},
);

export default plansRoutes;
