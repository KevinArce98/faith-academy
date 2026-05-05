import type { Context } from 'hono';

export type AuthState = {
	userId: string | null;
};

export type AuthVariables = {
	auth: AuthState;
};

export type AuthContext = Context<{ Variables: AuthVariables }>;
