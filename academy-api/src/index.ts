import { serve } from '@hono/node-server';

import { app } from './app.js';
import { startCronJobs } from './lib/cron.js';
import { logger } from './lib/logger.js';

// ── Server ─────────────────────────────────────────────────────────────────
serve(
	{
		fetch: app.fetch,
		port: Number(process.env.PORT ?? 3000),
	},
	(info) => {
		logger.info(`Server is running on http://localhost:${info.port}`);
	},
);

// ── Cron jobs internos ───────────────────────────────────────────────────────
startCronJobs();
