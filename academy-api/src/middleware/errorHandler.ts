import type { ErrorHandler } from 'hono';

import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorHandler = (err, c) => {
	if (err instanceof AppError) {
		return c.json(
			{
				error: {
					code: err.code,
					message: err.message,
					...(err.fields ? { fields: err.fields } : {}),
				},
			},
			err.status,
		);
	}

	logger.error(
		{
			err,
			method: c.req.method,
			path: c.req.path,
			requestId: c.req.header('x-request-id'),
		},
		'Unhandled error',
	);

	return c.json(
		{ error: { code: 'INTERNAL', message: 'Error interno del servidor.' } },
		500,
	);
};
