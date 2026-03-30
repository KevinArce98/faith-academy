import { verifyToken } from '@clerk/backend';
import type { MiddlewareHandler } from 'hono';
import type { AuthVariables } from '../types/auth.js';

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  return authorizationHeader.slice('Bearer '.length).trim();
}

function getClerkSecretKey(): string {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required');
  }
  return secretKey;
}

export const optionalAuthMiddleware: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  c.set('auth', { userId: null });

  const token = getBearerToken(c.req.header('authorization'));
  if (!token) {
    await next();
    return;
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: getClerkSecretKey(),
    });

    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    c.set('auth', { userId });
  } catch {
    c.set('auth', { userId: null });
  }

  await next();
};

export const authMiddleware: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  await optionalAuthMiddleware(c, async () => {
    return;
  });

  const auth = c.get('auth');
  if (!auth?.userId) {
    return c.json({ error: 'UNAUTHENTICATED' }, 401);
  }

  await next();
};
