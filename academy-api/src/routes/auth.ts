import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import type { AuthVariables } from '../types/auth.js';

const createProfileSchema = z.object({
  email: z.email('Email inválido'),
  name: z.string().min(1, 'El nombre es requerido'),
  avatarUrl: z.url('Avatar URL inválida').optional().nullable(),
});

const authRoutes = new Hono<{ Variables: AuthVariables }>();

authRoutes.get('/status', optionalAuthMiddleware, (c) => {
  const auth = c.get('auth');
  return c.json({ authenticated: Boolean(auth.userId), userId: auth.userId });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const { getCurrentUser } = await import('../lib/auth.js');
  const user = await getCurrentUser(c);

  if (!user) {
    return c.json({ error: 'UNAUTHENTICATED' }, 401);
  }

  return c.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  });
});

authRoutes.post('/profile', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createProfileSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'BAD_REQUEST', details: parsed.error.flatten() }, 400);
  }

  const auth = c.get('auth');
  if (!auth.userId) {
    return c.json({ error: 'UNAUTHENTICATED' }, 401);
  }

  const { db } = await import('../lib/db.js');

  const profile = await db.userProfile.upsert({
    where: { clerkId: auth.userId },
    update: {
      email: parsed.data.email,
      name: parsed.data.name,
      avatarUrl: parsed.data.avatarUrl ?? null,
      isActive: true,
    },
    create: {
      clerkId: auth.userId,
      email: parsed.data.email,
      name: parsed.data.name,
      avatarUrl: parsed.data.avatarUrl ?? null,
      role: 'STUDENT',
      isActive: true,
    },
  });

  return c.json({
    id: profile.id,
    clerkId: profile.clerkId,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    isActive: profile.isActive,
  });
});

export default authRoutes;
