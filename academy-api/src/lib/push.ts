import { db } from './db.js';
import { logger } from './logger.js';

// Envío de push vía Expo Push API (sin SDK, solo fetch) + persistencia de la
// notificación en la bandeja. Un solo helper `notify()` para todos los eventos.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_CHUNK = 100;

export type NotificationType =
	| 'PAYMENT_SUBMITTED'
	| 'PAYMENT_STATUS'
	| 'CLASS_CHANGED'
	| 'EXPIRING_MEMBERSHIP'
	| 'MEMBERSHIP_EXPIRED';

export type NotifyInput = {
	type: NotificationType;
	title: string;
	body: string;
	/** Payload para deep-link en el cliente, ej. { screen: 'payments' }. */
	data?: Record<string, unknown>;
};

type ExpoMessage = {
	to: string;
	title: string;
	body: string;
	sound: 'default';
	data?: Record<string, unknown>;
};

type ExpoTicket = {
	status: 'ok' | 'error';
	message?: string;
	details?: { error?: string };
};

function isExpoToken(token: string): boolean {
	return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

async function sendExpoChunk(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
	const res = await fetch(EXPO_PUSH_URL, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(messages),
	});
	if (!res.ok) {
		throw new Error(`Expo push HTTP ${res.status}`);
	}
	const json = (await res.json()) as { data?: ExpoTicket[] };
	return json.data ?? [];
}

/**
 * Crea una notificación en la bandeja para cada usuario y, si tienen tokens de
 * push registrados, la envía. Nunca lanza: los errores de push se loguean para
 * no romper la acción que la disparó.
 */
export async function notify(userIds: string[], input: NotifyInput): Promise<void> {
	const uniqueIds = [...new Set(userIds)].filter(Boolean);
	if (uniqueIds.length === 0) return;

	// 1) Persistir en la bandeja.
	try {
		await db.notification.createMany({
			data: uniqueIds.map((userId) => ({
				userId,
				type: input.type,
				title: input.title,
				body: input.body,
				data: (input.data ?? undefined) as never,
			})),
		});
	} catch (err) {
		logger.error({ err }, 'notify: fallo al persistir notificaciones');
	}

	// 2) Enviar push a los dispositivos registrados.
	try {
		const tokens = await db.pushToken.findMany({
			where: { userId: { in: uniqueIds }, user: { notificationsEnabled: true } },
			select: { token: true },
		});
		const valid = tokens.map((t) => t.token).filter(isExpoToken);
		if (valid.length === 0) return;

		const messages: ExpoMessage[] = valid.map((to) => ({
			to,
			title: input.title,
			body: input.body,
			sound: 'default',
			data: input.data,
		}));

		for (let i = 0; i < messages.length; i += EXPO_CHUNK) {
			const chunk = messages.slice(i, i + EXPO_CHUNK);
			const tickets = await sendExpoChunk(chunk);
			// Limpiar tokens que Expo reporta como no registrados.
			const toDelete: string[] = [];
			tickets.forEach((ticket, idx) => {
				if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
					toDelete.push(chunk[idx].to);
				}
			});
			if (toDelete.length > 0) {
				await db.pushToken.deleteMany({ where: { token: { in: toDelete } } });
			}
		}
	} catch (err) {
		logger.error({ err }, 'notify: fallo al enviar push');
	}
}

/** IDs de todos los admins activos (para notificar acciones de alumnos). */
export async function adminUserIds(): Promise<string[]> {
	const admins = await db.userProfile.findMany({
		where: { role: 'ADMIN', isActive: true },
		select: { id: true },
	});
	return admins.map((a) => a.id);
}
