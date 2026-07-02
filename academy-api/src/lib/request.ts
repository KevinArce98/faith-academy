import type { Context } from 'hono';
import type { z } from 'zod';

import { validationError } from './errors.js';
import { logger } from './logger.js';

export async function parseJsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch (err) {
		logger.warn({ err, path: c.req.path }, 'Failed to parse JSON body');
		return null;
	}
}

// Parsea y valida el body con zod; ante datos inválidos lanza VALIDATION_ERROR
// (422) con los errores por campo, que el errorHandler global serializa.
export async function parseBody<S extends z.ZodType>(
	c: Context,
	schema: S,
): Promise<z.infer<S>> {
	const body = await parseJsonBody(c);
	const parsed = schema.safeParse(body ?? {});
	if (!parsed.success) {
		throw validationError(
			parsed.error.flatten().fieldErrors as Record<string, string[]>,
		);
	}
	return parsed.data;
}
