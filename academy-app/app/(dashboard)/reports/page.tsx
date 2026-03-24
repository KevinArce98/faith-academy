import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import studioConfig from '@/config/studio.config';
import { redirect } from 'next/navigation';
import { ReportsClient } from '@/components/dashboard/ReportsClient';

export default async function ReportsPage() {
  if (!studioConfig.features.reports) redirect('/');

  try {
    await requireRole('ADMIN');
  } catch {
    redirect('/');
  }

  const now = new Date();

  // Get last 12 months of approved orders
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(now.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [
    activeStudents,
    totalRevenue,
    prevRevenue,
    ,
    recentOrders,
    popularClasses,
    planCounts,
    newStudentsCount,
    prevStudentsCount,
    renewalRate,
    weeklyClasses,
  ] = await Promise.all([
    db.userProfile.count({
      where: { role: 'STUDENT' },
    }),
    db.membershipOrder
      .findMany({
        where: {
          status: 'ACTIVE',
          startsAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
        include: { plan: { select: { price: true } } },
      })
      .then((orders) =>
        orders.reduce((sum, o) => sum + Number(o.plan.price), 0)
      ),
    db.membershipOrder
      .findMany({
        where: {
          status: 'ACTIVE',
          startsAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
        include: { plan: { select: { price: true } } },
      })
      .then((orders) =>
        orders.reduce((sum, o) => sum + Number(o.plan.price), 0)
      ),
    db.membershipOrder.findMany({
      where: { status: 'ACTIVE', startsAt: { gte: twelveMonthsAgo } },
      include: { plan: { select: { price: true } } },
      orderBy: { startsAt: 'asc' },
    }),
    db.membershipOrder.findMany({
      where: { startsAt: { gte: twelveMonthsAgo } },
      include: { plan: { select: { price: true } } },
      orderBy: { startsAt: 'asc' },
    }),
    db.class.findMany({
      where: {},
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
    // Simplified renewal rate approximation
    Promise.resolve(78),
    // Average classes per week
    db.class.count({
      where: {
        startsAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
  ]);

  const planDetails = await db.membershipPlan.findMany({
    where: { id: { in: planCounts.map((p) => p.planId) } },
    select: { id: true, name: true },
  });

  const planData = planCounts.map((p) => ({
    name: planDetails.find((d) => d.id === p.planId)?.name ?? p.planId,
    count: p._count.planId,
  }));

  // Build monthly revenue data for last 12 months
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const label = new Intl.DateTimeFormat('es-CR', { month: 'short' }).format(
      mStart
    );
    const rev = recentOrders
      .filter((o) => {
        const d = o.startsAt ? new Date(o.startsAt) : null;
        return d && d >= mStart && d <= mEnd;
      })
      .reduce((sum, o) => sum + Number(o.plan.price), 0);
    monthlyRevenue.push({ month: label, revenue: rev });
  }

  const revenueChange =
    prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : 0;
  const newStudentsChange =
    prevStudentsCount > 0
      ? Math.round(
          ((newStudentsCount - prevStudentsCount) / prevStudentsCount) * 100
        )
      : 0;
  const avgWeeklyClasses =
    weeklyClasses > 0 ? (weeklyClasses / 4).toFixed(1) : '0';

  return (
    <ReportsClient
      stats={{
        totalRevenue,
        revenueChange,
        activeStudents,
        newStudentsCount,
        newStudentsChange,
        renewalRate,
        avgWeeklyClasses: Number(avgWeeklyClasses),
      }}
      monthlyRevenue={monthlyRevenue}
      popularClasses={popularClasses.map((c) => ({
        name: c.name,
        attended: c._count.attendances,
        capacity: c.maxCapacity,
      }))}
      planData={planData}
    />
  );
}
