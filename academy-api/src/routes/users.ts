import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../lib/auth.js';
import { getClerkClient } from '../lib/clerk.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';
import type { Role } from '../lib/roles.js';

const usersRoutes = new Hono<{ Variables: AuthVariables }>();

const changeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
});

// PATCH /users/:id/role — change user role (admin only)
usersRoutes.patch('/:id/role', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = changeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 422);
  }

  const { role } = parsed.data;

  const user = await db.userProfile.update({
    where: { id },
    data: { role: role as Role },
  });

  try {
    const clerk = getClerkClient();
    await clerk.users.updateUser(user.clerkId, {
      publicMetadata: { role },
    });
  } catch {
    // noop - DB is source of truth
  }

  return c.json({ success: true, user });
});

export default usersRoutes;
