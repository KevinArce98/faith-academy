import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../lib/db.js';
import { conflict, notFound } from '../lib/errors.js';
import { parseBody } from '../lib/request.js';
import { monthPeriod } from '../lib/utils/date.js';
import { requireAuth, requireRole } from '../middleware/requireRole.js';
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
plansRoutes.get('/', requireAuth, async (c) => {
	const user = c.get('user');
	const isAdminUser = user.role === 'ADMIN';
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
plansRoutes.post('/', requireRole('ADMIN'), async (c) => {
	const parsed = await parseBody(c, planSchema);

	const plan = await db.membershipPlan.create({
		data: {
			...parsed,
			description: parsed.description ?? null,
			isActive: true,
		},
	});

	return c.json({ plan }, 201);
});

// PUT /plans/:id
plansRoutes.put('/:id', requireRole('ADMIN'), async (c) => {
	const id = c.req.param('id');
	const parsed = await parseBody(c, planSchema);

	const plan = await db.membershipPlan.update({
		where: { id },
		data: { ...parsed, description: parsed.description ?? null },
	});

	return c.json({ plan });
});

// DELETE /plans/:id
plansRoutes.delete('/:id', requireRole('ADMIN'), async (c) => {
	const id = c.req.param('id');
	const plan = await db.membershipPlan.findUnique({
		where: { id },
		include: {
			_count: { select: { subscriptions: true } },
		},
	});

	if (!plan) throw notFound('Plan no encontrado.');
	if (plan._count.subscriptions > 0) {
		throw conflict(
			'PLAN_HAS_SUBSCRIPTIONS',
			'No puedes eliminar un plan que tiene mensualidades registradas.',
		);
	}

	await db.membershipPlan.delete({ where: { id } });
	return c.json({ success: true });
});

// PATCH /plans/:id/toggle — toggle isActive
plansRoutes.patch('/:id/toggle', requireRole('ADMIN'), async (c) => {
	const id = c.req.param('id');
	const parsed = await parseBody(c, toggleSchema);

	const plan = await db.membershipPlan.update({
		where: { id },
		data: { isActive: parsed.isActive },
	});

	return c.json({ plan });
});

export default plansRoutes;
