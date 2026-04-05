import type { ErrorHandler } from 'hono';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorHandler = (err, c) => {
  logger.error(
    {
      err,
      method: c.req.method,
      path: c.req.path,
      requestId: c.req.header('x-request-id'),
    },
    'Unhandled error',
  );

  return c.json({ error: 'Error interno del servidor' }, 500);
};
