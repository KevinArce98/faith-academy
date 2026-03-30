import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../lib/auth.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';

const contentRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /content — list all content / video library
contentRoutes.get('/', authMiddleware, async (c) => {
  try {
    await requireRole(c, ['ADMIN', 'TEACHER', 'STUDENT']);
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const [contents, classes] = await Promise.all([
    db.content.findMany({
      include: { class: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.class.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return c.json({ contents, classes });
});

export default contentRoutes;
