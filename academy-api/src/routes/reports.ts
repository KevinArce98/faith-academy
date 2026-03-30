import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../lib/auth.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';

const reportsRoutes = new Hono<{ Variables: AuthVariables }>();

function sumPrice(orders: Array<{ plan: { price: unknown } }>): number {
  return orders.reduce((sum, o) => sum + Number(o.plan.price), 0);
}

// GET /reports
reportsRoutes.get('/', authMiddleware, async (c) => {
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

  const planDetails = await db.membershipPlan.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { id: { in: planCounts.map((p: any) => p.planId as string) } },
    select: { id: true, name: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planData = planCounts.map((p: any) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: planDetails.find((d: any) => d.id === p.planId)?.name ?? (p.planId as string),
    count: p._count.planId as number,
  }));

  // Build monthly revenue for last 12 months
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const label = new Intl.DateTimeFormat('es-CR', { month: 'short' }).format(mStart);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rev = (historicalOrders as any[])
      .filter((o: any) => {
        const d = o.startsAt ? new Date(o.startsAt as Date) : null;
        return d && d >= mStart && d <= mEnd;
      })
      .reduce((sum: number, o: any) => sum + Number(o.plan.price), 0);
    monthlyRevenue.push({ month: label, revenue: rev });
  }

  const revenueChange =
    prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;
  const newStudentsChange =
    prevStudentsCount > 0
      ? Math.round(((newStudentsCount - prevStudentsCount) / prevStudentsCount) * 100)
      : 0;
  const avgWeeklyClasses = weeklyClasses > 0 ? Number((weeklyClasses / 4).toFixed(1)) : 0;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    popularClasses: (popularClasses as any[]).map((cls: any) => ({
      name: cls.name as string,
      attended: cls._count.attendances as number,
      capacity: cls.maxCapacity as number,
    })),
    planData,
  });
});

export default reportsRoutes;
