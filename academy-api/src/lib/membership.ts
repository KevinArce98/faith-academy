import { db } from './db.js';
import { logger } from './logger.js';
import { notify } from './push.js';

// Lógica de vencimiento de membresías. Se usa desde los cron jobs internos
// (lib/cron.ts) y desde endpoints manuales de disparo/testeo.

/**
 * Recordatorio a los alumnos cuya membresía vence dentro de `daysAhead` días.
 * Devuelve cuántos avisos se enviaron.
 */
export async function remindExpiringMemberships(daysAhead = 3): Promise<number> {
	const now = new Date();
	const until = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

	const expiring = await db.membershipOrder.findMany({
		where: { status: 'ACTIVE', expiresAt: { gte: now, lte: until } },
		include: { plan: { select: { name: true } } },
	});

	let sent = 0;
	for (const order of expiring) {
		if (!order.expiresAt) continue;
		const daysLeft = Math.ceil(
			(order.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
		);
		await notify([order.studentId], {
			type: 'EXPIRING_MEMBERSHIP',
			title: 'Tu membresía vence pronto',
			body: `${order.plan?.name ?? 'Tu plan'} vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`,
			data: { screen: 'payments' },
		});
		sent++;
	}

	logger.info({ sent, daysAhead }, 'remindExpiringMemberships');
	return sent;
}

/**
 * Marca como EXPIRED las órdenes ACTIVE cuya fecha de vencimiento ya pasó y
 * avisa al alumno. La vigencia real (poder inscribirse) ya se calcula por fecha
 * en getPlanStatus; esto sincroniza el estado guardado y notifica. NO toca
 * `userProfile.isActive` (eso es la cuenta, no la membresía).
 * Devuelve cuántas órdenes se marcaron.
 */
export async function expireMemberships(): Promise<number> {
	const now = new Date();

	const expired = await db.membershipOrder.findMany({
		where: { status: 'ACTIVE', expiresAt: { lt: now } },
		include: { plan: { select: { name: true } } },
	});

	if (expired.length === 0) return 0;

	await db.membershipOrder.updateMany({
		where: { id: { in: expired.map((o) => o.id) } },
		data: { status: 'EXPIRED' },
	});

	for (const order of expired) {
		await notify([order.studentId], {
			type: 'MEMBERSHIP_EXPIRED',
			title: 'Tu membresía venció',
			body: `${order.plan?.name ?? 'Tu plan'} venció. Renuévalo para seguir asistiendo a clases.`,
			data: { screen: 'payments' },
		});
	}

	logger.info({ expired: expired.length }, 'expireMemberships');
	return expired.length;
}
