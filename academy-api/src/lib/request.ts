import type { Context } from 'hono';

import { logger } from './logger.js';

export async function parseJsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch (err) {
		logger.warn({ err, path: c.req.path }, 'Failed to parse JSON body');
		return null;
	}
}
