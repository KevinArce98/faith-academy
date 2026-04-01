import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { getCurrentUser } from '../lib/auth.js';
import { features } from '../lib/features.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';

const contentRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /content — list all content / video library
contentRoutes.get('/', authMiddleware, async (c) => {
  if (!features.lms) {
    return c.json({ error: 'Módulo no disponible' }, 403);
  }

  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ error: 'UNAUTHENTICATED' }, 401);
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
