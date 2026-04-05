import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../lib/auth.js';
import { features } from '../lib/features.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';

const reportsRoutes = new Hono<{ Variables: AuthVariables }>();

function sumPrice(orders: Array<{ plan: { price: unknown } }>): number {
  return orders.reduce((sum, o) => sum + Number(o.plan.price), 0);
}

// GET /reports
reportsRoutes.get('/', authMiddleware, async (c) => {
  if (!features.reports) {
    return c.json({ error: 'Módulo no disponible' }, 403);
  }

  try {
    await requireRole(c, 'ADMIN');
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const now = new Date();

  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(now.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [
    activeStudents,
    currentMonthOrders,
    prevMonthOrders,
    historicalOrders,
    popularClasses,
    planCounts,
    newStudentsCount,
    prevStudentsCount,
    weeklyClasses,
  ] = await Promise.all([
    db.userProfile.count({ where: { role: 'STUDENT' } }),
    db.membershipOrder.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      include: { plan: { select: { price: true } } },
    }),
    db.membershipOrder.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          lt: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
      include: { plan: { select: { price: true } } },
    }),
    db.membershipOrder.findMany({
      where: { status: 'ACTIVE', startsAt: { gte: twelveMonthsAgo } },
      include: { plan: { select: { price: true } } },
      orderBy: { startsAt: 'asc' },
    }),
    db.class.findMany({
      include: {
        _count: { select: { attendances: { where: { status: 'ATTENDED' } } } },
      },
      orderBy: { attendances: { _count: 'desc' } },
      take: 5,
    }),
    db.membershipOrder.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE' },
      _count: { planId: true },
    }),
    db.userProfile.count({
      where: {
        role: 'STUDENT',
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
    db.userProfile.count({
      where: {
        role: 'STUDENT',
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          lt: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
    }),
    db.class.count({
      where: { startsAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
    }),
  ]);

  const totalRevenue = sumPrice(currentMonthOrders);
  const prevRevenue = sumPrice(prevMonthOrders);

  type PlanCountRow = { planId: string; _count: { planId: number } };

  const planDetails = await db.membershipPlan.findMany({
    where: { id: { in: (planCounts as PlanCountRow[]).map((p) => p.planId) } },
    select: { id: true, name: true },
  });

  const planData = (planCounts as PlanCountRow[]).map((p) => ({
    name: planDetails.find((d) => d.id === p.planId)?.name ?? p.planId,
    count: p._count.planId,
  }));

  type HistoricalOrder = { startsAt: Date | null; plan: { price: unknown } };

  // Build monthly revenue for last 12 months
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const label = new Intl.DateTimeFormat('es-CR', { month: 'short' }).format(mStart);
    const rev = (historicalOrders as HistoricalOrder[])
      .filter((o) => {
        const d = o.startsAt ? new Date(o.startsAt) : null;
        return d && d >= mStart && d <= mEnd;
      })
      .reduce((sum, o) => sum + Number(o.plan.price), 0);
    monthlyRevenue.push({ month: label, revenue: rev });
  }

  const revenueChange =
    prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;
  const newStudentsChange =
    prevStudentsCount > 0
      ? Math.round(((newStudentsCount - prevStudentsCount) / prevStudentsCount) * 100)
      : 0;
  const avgWeeklyClasses = weeklyClasses > 0 ? Number((weeklyClasses / 4).toFixed(1)) : 0;

  type PopularClassRow = {
    name: string;
    maxCapacity: number;
    _count: { attendances: number };
  };

  return c.json({
    stats: {
      totalRevenue,
      revenueChange,
      activeStudents,
      newStudentsCount,
      newStudentsChange,
      renewalRate: 78,
      avgWeeklyClasses,
    },
    monthlyRevenue,
    popularClasses: (popularClasses as PopularClassRow[]).map((cls) => ({
      name: cls.name,
      attended: cls._count.attendances,
      capacity: cls.maxCapacity,
    })),
    planData,
  });
});

export default reportsRoutes;
