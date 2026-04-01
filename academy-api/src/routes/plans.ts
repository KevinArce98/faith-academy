import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../lib/auth.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';

const plansRoutes = new Hono<{ Variables: AuthVariables }>();

const planSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().nullable(),
  price: z.number().nonnegative('El precio debe ser un número válido'),
  credits: z.number().int().nonnegative('Los créditos deben ser un número válido'),
  intervalType: z.enum(['MONTHLY', 'WEEKLY', 'FIXED_PACKAGE']),
  intervalValue: z.number().int().min(1, 'El valor de intervalo debe ser al menos 1'),
});

const toggleSchema = z.object({
  isActive: z.boolean(),
});

// GET /plans
plansRoutes.get('/', authMiddleware, async (c) => {
  const activeOnly = c.req.query('activeOnly') === 'true';

  const plans = await db.membershipPlan.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { orders: { where: { status: 'ACTIVE' } } },
      },
    },
  });

  return c.json({ plans });
});

// POST /plans
plansRoutes.post('/', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 422);
  }

  const plan = await db.membershipPlan.create({
    data: { ...parsed.data, description: parsed.data.description ?? null, isActive: true },
  });

  return c.json({ plan }, 201);
});

// PUT /plans/:id
plansRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 422);
  }

  const plan = await db.membershipPlan.update({
    where: { id },
    data: { ...parsed.data, description: parsed.data.description ?? null },
  });

  return c.json({ plan });
});

// DELETE /plans/:id
plansRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const id = c.req.param('id');
  const plan = await db.membershipPlan.findUnique({
    where: { id },
    include: { _count: { select: { orders: { where: { status: 'ACTIVE' } } } } },
  });

  if (!plan) return c.json({ error: 'Plan no encontrado.' }, 404);
  if (plan._count.orders > 0) {
    return c.json({ error: 'No puedes eliminar un plan con alumnos activos.' }, 400);
  }

  await db.membershipPlan.delete({ where: { id } });
  return c.json({ success: true });
});

// PATCH /plans/:id/toggle — toggle isActive
plansRoutes.patch('/:id/toggle', authMiddleware, async (c) => {
  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 422);
  }

  const plan = await db.membershipPlan.update({
    where: { id },
    data: { isActive: parsed.data.isActive },
  });

  return c.json({ plan });
});

export default plansRoutes;
