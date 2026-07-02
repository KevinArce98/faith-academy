import type { MiddlewareHandler } from 'hono';

import { db } from '../lib/db.js';
import { forbidden, unauthenticated } from '../lib/errors.js';
import type { Role } from '../lib/roles.js';
import type { AuthVariables } from '../types/auth.js';

// Único middleware de autorización: valida sesión, opcionalmente exige rol y
// deja el usuario en el contexto (c.get('user')) para que los handlers no
// vuelvan a consultarlo.
export function requireRole(
	...roles: Role[]
): MiddlewareHandler<{ Variables: AuthVariables }> {
	return async (c, next) => {
		const auth = c.get('auth');
		if (!auth?.userId) throw unauthenticated();

		const user = await db.userProfile.findUnique({
			where: { id: auth.userId },
		});
		if (!user || !user.isActive) throw unauthenticated();

		if (roles.length > 0 && !roles.includes(user.role as Role)) {
			throw forbidden();
		}

		c.set('user', user);
		await next();
	};
}

// Cualquier usuario autenticado, sin restricción de rol.
export const requireAuth = requireRole();
