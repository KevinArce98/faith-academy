import type { MiddlewareHandler } from 'hono';

import { verifyAccessToken } from '../lib/jwt.js';
import type { AuthVariables } from '../types/auth.js';

function getBearerToken(header: string | undefined): string | null {
	if (!header?.startsWith('Bearer ')) return null;
	return header.slice('Bearer '.length).trim();
}

export const optionalAuthMiddleware: MiddlewareHandler<{
	Variables: AuthVariables;
}> = async (c, next) => {
	c.set('auth', { userId: null });

	const token = getBearerToken(c.req.header('authorization'));
	if (!token) {
		await next();
		return;
	}

	try {
		const payload = await verifyAccessToken(token);
		c.set('auth', { userId: payload.sub });
	} catch {
		c.set('auth', { userId: null });
	}

	await next();
};

export const authMiddleware: MiddlewareHandler<{
	Variables: AuthVariables;
}> = async (c, next) => {
	const existing = c.get('auth');

	if (!existing) {
		await optionalAuthMiddleware(c, async () => {});
	}

	const auth = c.get('auth');
	if (!auth?.userId) {
		return c.json({ error: 'UNAUTHENTICATED' }, 401);
	}

	await next();
};
