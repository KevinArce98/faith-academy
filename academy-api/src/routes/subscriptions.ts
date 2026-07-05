import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../lib/db.js';
import { notFound } from '../lib/errors.js';
import { invalidatePayouts } from '../lib/payouts.js';
import { parseBody } from '../lib/request.js';
import { addMonths, monthPeriod, parseMonthPeriod } from '../lib/utils/date.js';
import { requireRole } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const subscriptionsRoutes = new Hono<{ Variables: AuthVariables }>();

const upsertSchema = z.object({
	studentId: z.string().min(1, 'El alumno es requerido'),
	planId: z.string().min(1, 'El plan es requerido'),
	period: z.string().optional(), // "YYYY-MM"; por defecto el mes actual
	isPaid: z.boolean().optional(),
});

const paySchema = z.object({
	isPaid: z.boolean(),
});

// GET /subscriptions?studentId=&period=YYYY-MM
// Histórico de mensualidades/planes de un alumno (o de un mes concreto).
subscriptionsRoutes.get(
	'/',
	requireRole('ADMIN', 'TEACHER'),
	async (c) => {
		const studentId = c.req.query('studentId');
		const periodParam = c.req.query('period');

		const subscriptions = await db.monthlySubscription.findMany({
			where: {
				...(studentId ? { studentId } : {}),
				...(periodParam ? { period: parseMonthPeriod(periodParam) } : {}),
			},
			orderBy: { period: 'desc' },
			select: {
				id: true,
				studentId: true,
				period: true,
				amount: true,
				isPaid: true,
				paidAt: true,
				plan: {
					select: {
						id: true,
						name: true,
						isPublic: true,
						classesPerWeek: true,
						isSingleClass: true,
					},
				},
				student: { select: { id: true, name: true, avatarUrl: true, email: true } },
			},
		});

		return c.json({ subscriptions });
	},
);

// POST /subscriptions — asigna un plan a un alumno para un mes (upsert).
// El monto es el precio del plan (snapshot), así una beca de ₡0 aporta ₡0.
subscriptionsRoutes.post(
	'/',
	requireRole('ADMIN', 'TEACHER'),
	async (c) => {
		const parsed = await parseBody(c, upsertSchema);

		const { studentId, planId, isPaid } = parsed;
		const period = parsed.period
			? parseMonthPeriod(parsed.period)
			: monthPeriod();

		const plan = await db.membershipPlan.findUnique({
			where: { id: planId },
			select: { price: true },
		});
		if (!plan) throw notFound('Plan no encontrado.');

		const now = new Date();
		const paidFields = (paid: boolean) => ({
			isPaid: paid,
			paidAt: paid ? now : null,
			expiresAt: paid ? addMonths(now, 1) : null,
		});

		const subscription = await db.monthlySubscription.upsert({
			where: { studentId_period: { studentId, period } },
			create: {
				studentId,
				planId,
				period,
				amount: plan.price,
				...paidFields(isPaid ?? false),
			},
			update: {
				planId,
				amount: plan.price,
				...(isPaid !== undefined ? paidFields(isPaid) : {}),
			},
			include: { plan: { select: { id: true, name: true } } },
		});

		invalidatePayouts();
		return c.json({ subscription }, 201);
	},
);

// PATCH /subscriptions/:id/pay — marca la mensualidad como pagada / pendiente.
subscriptionsRoutes.patch(
	'/:id/pay',
	requireRole('ADMIN', 'TEACHER'),
	async (c) => {
		const id = c.req.param('id');
		const parsed = await parseBody(c, paySchema);

		const now = new Date();
		const subscription = await db.monthlySubscription.update({
			where: { id },
			data: {
				isPaid: parsed.isPaid,
				paidAt: parsed.isPaid ? now : null,
				// Ciclo por aniversario: vence 1 mes después del pago.
				expiresAt: parsed.isPaid ? addMonths(now, 1) : null,
			},
		});

		invalidatePayouts();
		return c.json({ subscription });
	},
);

export default subscriptionsRoutes;
