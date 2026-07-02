import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../lib/db.js';
import {
	expireMemberships,
	remindExpiringMemberships,
} from '../lib/membership.js';
import { parseBody, parseJsonBody } from '../lib/request.js';
import { unauthenticated } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireRole.js';
import type { AuthVariables } from '../types/auth.js';

const notificationsRoutes = new Hono<{ Variables: AuthVariables }>();

const registerSchema = z.object({
	token: z.string().min(1),
	platform: z.enum(['ios', 'android']).optional(),
});

const unregisterSchema = z.object({
	token: z.string().min(1),
});

// GET /notifications — bandeja del usuario (más recientes primero).
notificationsRoutes.get('/', requireAuth, async (c) => {
	const user = c.get('user');

	const rows = await db.notification.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: 'desc' },
		take: 50,
	});

	const notifications = rows.map((n) => ({
		id: n.id,
		type: n.type,
		title: n.title,
		body: n.body,
		data: n.data ?? null,
		read: n.readAt != null,
		createdAt: n.createdAt.toISOString(),
	}));

	return c.json({
		notifications,
		unreadCount: notifications.filter((n) => !n.read).length,
	});
});

// POST /notifications/read — marca todas como leídas (o una si viene { id }).
notificationsRoutes.post('/read', requireAuth, async (c) => {
	const user = c.get('user');

	const body = (await parseJsonBody(c)) as { id?: string } | null;
	await db.notification.updateMany({
		where: {
			userId: user.id,
			readAt: null,
			...(body?.id ? { id: body.id } : {}),
		},
		data: { readAt: new Date() },
	});

	return c.json({ success: true });
});

// POST /notifications/register-device — guarda el token de push de Expo.
notificationsRoutes.post('/register-device', requireAuth, async (c) => {
	const user = c.get('user');
	const { token, platform } = await parseBody(c, registerSchema);

	// Un token pertenece a un solo usuario: si ya existía, se reasigna.
	await db.pushToken.upsert({
		where: { token },
		create: { token, platform, userId: user.id },
		update: { userId: user.id, platform },
	});

	return c.json({ success: true });
});

// POST /notifications/unregister-device — al cerrar sesión.
notificationsRoutes.post('/unregister-device', requireAuth, async (c) => {
	const user = c.get('user');
	const { token } = await parseBody(c, unregisterSchema);

	await db.pushToken.deleteMany({
		where: { token, userId: user.id },
	});

	return c.json({ success: true });
});

// Disparo manual de los jobs de membresía (testeo / respaldo del cron interno).
// Protegido por header X-Cron-Secret. Los cron internos (lib/cron.ts) corren
// solos; estos endpoints permiten forzarlos.
function requireCronSecret(header: string | undefined): void {
	const secret = process.env.CRON_SECRET;
	if (!secret || header !== secret) throw unauthenticated();
}

// POST /notifications/cron/expiring — recordatorio de membresías por vencer.
notificationsRoutes.post('/cron/expiring', async (c) => {
	requireCronSecret(c.req.header('X-Cron-Secret'));
	const daysAhead = Number(c.req.query('days') ?? '3');
	const sent = await remindExpiringMemberships(daysAhead);
	return c.json({ success: true, sent });
});

// POST /notifications/cron/expire — marca vencidas las membresías ya expiradas.
notificationsRoutes.post('/cron/expire', async (c) => {
	requireCronSecret(c.req.header('X-Cron-Secret'));
	const expired = await expireMemberships();
	return c.json({ success: true, expired });
});

export default notificationsRoutes;
