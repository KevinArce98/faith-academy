import { schedule } from 'node-cron';

import { logger } from './logger.js';
import { expireMemberships, remindExpiringMemberships } from './membership.js';

// Cron jobs internos (node-cron). Corren dentro del proceso del API, que está
// siempre vivo. Pensado para UNA sola instancia; si algún día se escala a
// varias, mover a un cron externo o añadir un lock para evitar duplicados.

const TZ = process.env.CRON_TZ ?? 'America/Costa_Rica';

async function run(name: string, fn: () => Promise<number>) {
	try {
		const count = await fn();
		logger.info({ job: name, count }, 'cron job ok');
	} catch (err) {
		logger.error({ job: name, err }, 'cron job falló');
	}
}

export function startCronJobs(): void {
	// Recordatorio de membresías por vencer — diario 09:00.
	schedule('0 9 * * *', () => run('remind-expiring', () => remindExpiringMemberships()), {
		timezone: TZ,
	});

	// Marcar membresías vencidas como EXPIRED — diario 00:15.
	schedule('15 0 * * *', () => run('expire-memberships', () => expireMemberships()), {
		timezone: TZ,
	});

	logger.info({ tz: TZ }, 'cron jobs registrados');
}
