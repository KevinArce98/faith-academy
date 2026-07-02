import type { Context } from 'hono';

import type { UserProfileModel } from '../lib/generated/prisma/models.js';

export type AuthState = {
	userId: string | null;
};

export type AuthVariables = {
	auth: AuthState;
	// Seteado por requireRole/requireAuth; los handlers lo leen con c.get('user').
	user: UserProfileModel;
};

export type AuthContext = Context<{ Variables: AuthVariables }>;
