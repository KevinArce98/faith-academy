import type { Context } from 'hono';

import { requireRole } from './auth.js';
import type { Role } from './roles.js';

type AuthUser = Awaited<ReturnType<typeof requireRole>>;

type AuthResult =
	| { user: AuthUser; error: null }
	| { user: null; error: Response };

export async function authorizeRole(
	c: Context,
	role: Role | Role[],
): Promise<AuthResult> {
	try {
		const user = await requireRole(c, role);
		return { user, error: null };
	} catch (e) {
		const status =
			e instanceof Error && e.message === 'UNAUTHENTICATED' ? 401 : 403;
		return { user: null, error: c.json({ error: 'No autorizado' }, status) };
	}
}
