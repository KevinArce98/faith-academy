import type { MiddlewareHandler } from 'hono';

import { requireRole } from '../lib/auth.js';
import type { Role } from '../lib/roles.js';
import type { AuthVariables } from '../types/auth.js';

type RoleInput = Role | Role[];

export function requireRoleMiddleware(
	role: RoleInput,
): MiddlewareHandler<{ Variables: AuthVariables }> {
	return async (c, next) => {
		try {
			await requireRole(c, role);
		} catch (error) {
			const status =
				error instanceof Error && error.message === 'UNAUTHENTICATED'
					? 401
					: 403;
			return c.json({ error: 'No autorizado' }, status);
		}
		await next();
	};
}
