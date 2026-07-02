import { Hono } from 'hono';

import { computePayouts } from '../lib/payouts.js';
import { parseMonthPeriod } from '../lib/utils/date.js';
import { requireRole } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const payoutsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /payouts?period=YYYY-MM
// Pago a cada profesor en el mes: por cada alumno con mensualidad PAGADA, su
// monto ÷ nº de clases distintas asistidas, repartido en partes iguales y
// sumado por profesor.
payoutsRoutes.get('/', requireRole('ADMIN'), async (c) => {
	const period = parseMonthPeriod(c.req.query('period'));
	const { totals, payouts } = await computePayouts(period);
	return c.json({ period, totals, payouts });
});

export default payoutsRoutes;
