import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { getCurrentUser, requireRole } from '../lib/auth.js';
import { db } from '../lib/db.js';
import type { AuthVariables } from '../types/auth.js';

const dashboardRoutes = new Hono<{ Variables: AuthVariables }>();

function sumPrice(orders: Array<{ plan: { price: unknown } }>): number {
  return orders.reduce((sum, o) => sum + Number(o.plan.price), 0);
}

// GET /dashboard/student — student dashboard data
dashboardRoutes.get('/student', authMiddleware, async (c) => {
  const user = await getCurrentUser(c);
  if (!user || user.role !== 'STUDENT') {
    return c.json({ error: 'No autorizado' }, 403);
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [latestLedger, activeOrderData, upcomingAttendances, recentOrders] = await Promise.all([
    db.creditLedger.findFirst({
      where: { studentId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    db.membershipOrder.findFirst({
      where: { studentId: user.id, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { expiresAt: 'desc' },
    }),
    db.attendance.findMany({
      where: {
        studentId: user.id,
        status: 'RESERVED',
        class: { startsAt: { gte: todayStart } },
      },
      include: {
        class: {
          select: { id: true, name: true, startsAt: true, endsAt: true, skillLevel: true },
        },
      },
      orderBy: { class: { startsAt: 'asc' } },
      take: 5,
    }),
    db.membershipOrder.findMany({
      where: { studentId: user.id },
      include: { plan: { select: { name: true, price: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const creditBalance = latestLedger?.balance ?? 0;

  const activeOrder = activeOrderData
    ? {
        id: activeOrderData.id,
        planName: activeOrderData.plan.name,
        status: activeOrderData.status,
        creditsRemaining: creditBalance,
        expiresAt: activeOrderData.expiresAt?.toISOString() ?? null,
      }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingClasses = upcomingAttendances.map((a: any) => ({
    id: a.class.id as string,
    name: a.class.name as string,
    startsAt: (a.class.startsAt as Date).toISOString(),
    endsAt: (a.class.endsAt as Date).toISOString(),
    skillLevel: a.class.skillLevel as string,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentPayments = recentOrders.map((o: any) => ({
    id: o.id as string,
    planName: o.plan.name as string,
    status: o.status as string,
    createdAt: (o.createdAt as Date).toISOString(),
    price: Number(o.plan.price),
  }));

  return c.json({
    userName: user.name ?? '',
    creditBalance,
    activeOrder,
    upcomingClasses,
    recentPayments,
  });
});

// GET /dashboard/admin — admin/teacher dashboard data
dashboardRoutes.get('/admin', authMiddleware, async (c) => {
  try {
    await requireRole(c, ['ADMIN', 'TEACHER']);
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;
    return c.json({ error: 'No autorizado' }, status);
  }

  const user = await getCurrentUser(c);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const in7days = new Date(now);
  in7days.setDate(now.getDate() + 7);

  const [
    activeStudents,
    pendingOrders,
    expiringOrders,
    todayClasses,
    newStudents,
    currentMonthOrders,
    prevMonthOrders,
  ] = await Promise.all([
    db.userProfile.count({ where: { role: 'STUDENT' } }),
    db.membershipOrder.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        plan: { select: { id: true, name: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.membershipOrder.count({
      where: { status: 'ACTIVE', expiresAt: { lte: in7days, gte: now } },
    }),
    db.class.findMany({
      where: { startsAt: { gte: todayStart, lte: todayEnd } },
      include: { _count: { select: { attendances: true } } },
      orderBy: { startsAt: 'asc' },
    }),
    db.userProfile.findMany({
      where: { role: 'STUDENT', createdAt: { gte: weekStart } },
      include: {
        orders: {
          where: { status: 'ACTIVE' },
          include: { plan: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
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
  ]);

  const monthRevenue = sumPrice(currentMonthOrders);
  const prevMonthRevenue = sumPrice(prevMonthOrders);

  const revenueChange =
    prevMonthRevenue > 0
      ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : 0;

  return c.json({
    userName: user?.name ?? '',
    activeStudents,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingOrders: pendingOrders.map((o: any) => ({
      id: o.id as string,
      studentId: o.studentId as string,
      studentName: (o.student?.name ?? '') as string,
      studentEmail: (o.student?.email ?? '') as string,
      planName: (o.plan?.name ?? '') as string,
      planPrice: Number(o.plan?.price ?? 0),
      status: o.status as string,
      receiptUrl: o.receiptUrl as string | null,
      createdAt: (o.createdAt as Date).toISOString(),
    })),
    expiringOrders,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    todayClasses: todayClasses.map((cls: any) => ({
      id: cls.id as string,
      name: cls.name as string,
      startsAt: (cls.startsAt as Date).toISOString(),
      endsAt: (cls.endsAt as Date).toISOString(),
      attendanceCount: cls._count.attendances as number,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newStudents: newStudents.map((s: any) => ({
      id: s.id as string,
      name: s.name as string | null,
      email: s.email as string,
      createdAt: (s.createdAt as Date).toISOString(),
      planName: (s.orders[0]?.plan?.name ?? null) as string | null,
    })),
    monthRevenue,
    revenueChange,
  });
});

export default dashboardRoutes;
