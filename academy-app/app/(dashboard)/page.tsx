import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { approvePayment, rejectPayment } from '@/actions/payments';
import { Users, DollarSign, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isStudent } from '@/lib/roles';
import type { Role } from '@/lib/roles';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos dias';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function timeAgo(date: Date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `Hace ${mins} minutos`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
  return `Hace ${Math.floor(hrs / 24)} dias`;
}

function StudentInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <div className="bg-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
      <span className="text-xs font-bold text-white">{initials}</span>
    </div>
  );
}

// ─── Student dashboard data loader ──────────────────────────────────────────
async function getStudentDashboardData(userId: string, userName: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [creditLedger, activeOrderData, upcomingAttendances, recentOrders] =
    await Promise.all([
      db.creditLedger.aggregate({
        where: { studentId: userId },
        _sum: { amount: true },
      }),
      db.membershipOrder.findFirst({
        where: { studentId: userId, status: 'ACTIVE' },
        include: { plan: true },
        orderBy: { expiresAt: 'desc' },
      }),
      db.attendance.findMany({
        where: {
          studentId: userId,
          status: 'RESERVED',
          class: { startsAt: { gte: todayStart } },
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              startsAt: true,
              endsAt: true,
              skillLevel: true,
            },
          },
        },
        orderBy: { class: { startsAt: 'asc' } },
        take: 5,
      }),
      db.membershipOrder.findMany({
        where: { studentId: userId },
        include: { plan: { select: { name: true, price: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

  const creditBalance = creditLedger._sum.amount ?? 0;

  const activeOrder = activeOrderData
    ? {
        id: activeOrderData.id,
        planName: activeOrderData.plan.name,
        status: activeOrderData.status,
        creditsRemaining: creditBalance,
        expiresAt: activeOrderData.expiresAt?.toISOString() ?? null,
      }
    : null;

  const upcomingClasses = upcomingAttendances.map((a) => ({
    id: a.class.id,
    name: a.class.name,
    startsAt: a.class.startsAt.toISOString(),
    endsAt: a.class.endsAt.toISOString(),
    skillLevel: a.class.skillLevel,
  }));

  const recentPayments = recentOrders.map((o) => ({
    id: o.id,
    planName: o.plan.name,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    price: Number(o.plan.price),
  }));

  return {
    userName: userName ?? '',
    creditBalance,
    activeOrder,
    upcomingClasses,
    recentPayments,
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  // ─── Student view ───────────────────────────────────────────────────────
  if (isStudent(user.role as Role)) {
    const data = await getStudentDashboardData(user.id, user.name ?? '');
    return <StudentDashboard {...data} />;
  }

  // ─── Admin / Teacher view ──────────────────────────────────────────────

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
    monthRevenue,
    prevMonthRevenue,
  ] = await Promise.all([
    db.userProfile.count({
      where: { role: 'STUDENT' },
    }),
    db.membershipOrder.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: { student: true, plan: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.membershipOrder.count({
      where: { status: 'ACTIVE', expiresAt: { lte: in7days, gte: now } },
    }),
    db.class.findMany({
      where: {
        startsAt: { gte: todayStart, lte: todayEnd },
      },
      include: { _count: { select: { attendances: true } } },
      orderBy: { startsAt: 'asc' },
    }),
    db.userProfile.findMany({
      where: {
        role: 'STUDENT',
        createdAt: { gte: weekStart },
      },
      include: {
        orders: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.membershipOrder
      .findMany({
        where: {
          status: 'ACTIVE',
          startsAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
        include: { plan: true },
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
        include: { plan: true },
      })
      .then((orders) =>
        orders.reduce((sum, o) => sum + Number(o.plan.price), 0)
      ),
  ]);

  const revenueChange =
    prevMonthRevenue > 0
      ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : 0;

  const kpis = [
    {
      label: 'Alumnos Activos',
      value: activeStudents.toLocaleString(),
      icon: Users,
      sub: `+${newStudents.length} nuevos este mes`,
      subColor: 'text-success',
    },
    {
      label: 'Ingresos del Mes',
      value: `$${monthRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      sub: `${revenueChange >= 0 ? '+' : ''}${revenueChange}% vs mes anterior`,
      subColor: revenueChange >= 0 ? 'text-success' : 'text-danger',
    },
    {
      label: 'Membresias por Vencer',
      value: String(expiringOrders),
      icon: AlertTriangle,
      sub: 'proximos 7 dias',
      subColor: 'text-warning',
      valueColor: 'text-warning',
    },
    {
      label: 'Pagos Pendientes',
      value: String(pendingOrders.length),
      icon: FileText,
      sub: 'requieren aprobacion',
      subColor: 'text-danger',
      valueColor: 'text-danger',
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h1 className="text-dark text-2xl font-bold md:text-[28px]">
          {greeting()}, {user?.name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-400 capitalize">{formatDate(now)}</p>
      </div>

      {/* ── KPI Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-5"
          >
            <div className="mb-2 flex items-start justify-between md:mb-3">
              <p className="text-xs text-gray-400 md:text-sm">{kpi.label}</p>
              <kpi.icon className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
            </div>
            <p
              className={`text-2xl font-bold md:text-4xl ${kpi.valueColor ?? 'text-dark'} mb-1`}
            >
              {kpi.value}
            </p>
            <p className={`text-xs font-medium ${kpi.subColor}`}>● {kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main content ──────────────────────────── */}
      <div className="flex flex-col gap-4 md:grid md:grid-cols-1 lg:grid-cols-[1fr_340px] lg:gap-6">
        {/* Pending payments */}
        <div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-dark text-base font-bold">
              Pagos Pendientes de Aprobacion
            </h2>
            <Link
              href="/payments"
              className="text-primary text-sm font-semibold hover:underline"
            >
              Ver todos →
            </Link>
          </div>

          {pendingOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Sin pagos pendientes
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden w-full text-sm md:table">
                <thead>
                  <tr className="border-b border-gray-50 text-xs tracking-wide text-gray-400 uppercase">
                    <th className="py-2 text-left font-medium">Alumno</th>
                    <th className="py-2 text-left font-medium">Plan</th>
                    <th className="py-2 text-left font-medium">
                      Fecha Solicitud
                    </th>
                    <th className="py-2 text-left font-medium">Comprobante</th>
                    <th className="py-2 text-left font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendingOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <StudentInitials name={order.student.name} />
                          <div>
                            <p className="text-dark font-medium">
                              {order.student.name}
                            </p>
                            <p className="text-primary text-xs">
                              {order.student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="bg-dark rounded-full px-2.5 py-1 text-xs font-medium text-white">
                          {order.plan.name}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {timeAgo(order.createdAt)}
                      </td>
                      <td className="py-3">
                        {order.receiptUrl ? (
                          <a
                            href={order.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary flex items-center gap-1 text-xs hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" /> ver
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <form
                            action={async () => {
                              'use server';
                              await approvePayment(order.id);
                            }}
                          >
                            <Button
                              type="submit"
                              variant="contained"
                              color="success"
                              className="rounded-lg px-3 py-1 text-xs"
                            >
                              Aprobar
                            </Button>
                          </form>
                          <form
                            action={async () => {
                              'use server';
                              await rejectPayment(order.id);
                            }}
                          >
                            <Button
                              type="submit"
                              variant="outlined"
                              color="danger"
                              className="rounded-lg px-3 py-1 text-xs"
                            >
                              Rechazar
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {pendingOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl bg-gray-50 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <StudentInitials name={order.student.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-dark truncate text-sm font-bold">
                          {order.student.name}
                        </p>
                      </div>
                      <span className="bg-dark shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-white">
                        {order.plan.name}
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-gray-400">
                      {timeAgo(order.createdAt)}
                    </p>
                    {order.receiptUrl && (
                      <a
                        href={order.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary mb-3 inline-flex items-center gap-1 text-xs hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" /> Ver comprobante
                      </a>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <form
                        action={async () => {
                          'use server';
                          await approvePayment(order.id);
                        }}
                      >
                        <Button
                          type="submit"
                          variant="contained"
                          color="success"
                          className="min-h-[44px] w-full rounded-lg text-xs"
                        >
                          Aprobar
                        </Button>
                      </form>
                      <form
                        action={async () => {
                          'use server';
                          await rejectPayment(order.id);
                        }}
                      >
                        <Button
                          type="submit"
                          variant="outlined"
                          color="danger"
                          className="min-h-[44px] w-full rounded-lg text-xs"
                        >
                          Rechazar
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 lg:gap-6">
          {/* Today's classes */}
          <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-dark text-base font-bold">Clases de Hoy</h2>
              <span className="text-xs text-gray-400">
                {new Intl.DateTimeFormat('es-MX', {
                  day: 'numeric',
                  month: 'long',
                }).format(now)}
              </span>
            </div>
            {todayClasses.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                Sin clases hoy
              </p>
            ) : (
              <div className="space-y-2.5">
                {todayClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 font-mono text-xs text-gray-400">
                      {formatTime(cls.startsAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-dark truncate text-sm font-medium">
                        {cls.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {cls._count.attendances}/{cls.maxCapacity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New students */}
          <div className="flex-1 rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
            <h2 className="text-dark mb-4 text-base font-bold">
              Alumnos Nuevos esta Semana
            </h2>
            {newStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                Sin alumnos nuevos
              </p>
            ) : (
              <div className="space-y-3">
                {newStudents.map((student) => {
                  const plan = student.orders[0]?.plan;
                  const daysAgo = Math.floor(
                    (now.getTime() - student.createdAt.getTime()) / 86400000
                  );
                  return (
                    <div key={student.id} className="flex items-center gap-3">
                      <StudentInitials name={student.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-dark truncate text-sm font-medium">
                          {student.name}
                        </p>
                        {plan && (
                          <span className="text-primary text-xs">
                            {plan.name}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {daysAgo === 0 ? 'Hoy' : `Hace ${daysAgo}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
