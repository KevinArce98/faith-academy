import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, DollarSign, AlertTriangle, FileText, Calendar, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { useApiClient } from '@/lib/api';
import { isStudent } from '@/lib/roles';
import { InlineSpinner } from '@/components/ui/Spinner';
import type { MeResponse } from '@/lib/interfaces/auth';
import {
  formatDate,
  formatPrice,
  formatTime,
  getInitials,
  greeting,
  timeAgo,
} from '@/utils/general';

// ─── Types ──────────────────────────────────────────────────────────────────

type PendingOrder = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  planName: string;
  planPrice: number;
  status: string;
  receiptUrl: string | null;
  createdAt: string;
};

type TodayClass = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  attendanceCount: number;
  maxCapacity?: number;
};

type NewStudent = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  planName: string | null;
};

type AdminDashboardData = {
  userName: string;
  activeStudents: number;
  pendingOrders: PendingOrder[];
  expiringOrders: number;
  todayClasses: TodayClass[];
  newStudents: NewStudent[];
  monthRevenue: number;
  revenueChange: number;
};

type StudentDashboardData = {
  userName: string;
  creditBalance: number;
  activeOrder: {
    id: string;
    planName: string;
    status: string;
    creditsRemaining: number;
    expiresAt: string | null;
  } | null;
  upcomingClasses: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    skillLevel: string;
  }[];
  recentPayments: {
    id: string;
    planName: string;
    status: string;
    createdAt: string;
    price: number;
  }[];
};

// ─── Helper component ────────────────────────────────────────────────────────

function StudentInitials({ name }: { name: string }) {
  const initials = getInitials(name);
  return (
    <div className="bg-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
      <span className="text-xs font-bold text-white">{initials}</span>
    </div>
  );
}

// ─── Admin dashboard view ────────────────────────────────────────────────────

function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const now = new Date();

  const approveMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiClient(`/api/v1/payments/orders/${orderId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiClient(`/api/v1/payments/orders/${orderId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes: '' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const {
    activeStudents,
    pendingOrders,
    expiringOrders,
    todayClasses,
    newStudents,
    monthRevenue,
    revenueChange,
  } = data;

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
      value: formatPrice(monthRevenue),
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
          {greeting()}, {data.userName?.split(' ')[0]} 👋
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
              to="/payments"
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
                          <StudentInitials name={order.studentName} />
                          <div>
                            <p className="text-dark font-medium">
                              {order.studentName}
                            </p>
                            <p className="text-primary text-xs">
                              {order.studentEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="bg-dark rounded-full px-2.5 py-1 text-xs font-medium text-white">
                          {order.planName}
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
                          <Button
                            type="button"
                            variant="contained"
                            color="success"
                            className="rounded-lg px-3 py-1 text-xs"
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            onClick={() => approveMutation.mutate(order.id)}
                          >
                            Aprobar
                          </Button>
                          <Button
                            type="button"
                            variant="outlined"
                            color="danger"
                            className="rounded-lg px-3 py-1 text-xs"
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            onClick={() => rejectMutation.mutate(order.id)}
                          >
                            Rechazar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {pendingOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="rounded-xl bg-gray-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <StudentInitials name={order.studentName} />
                      <div className="min-w-0 flex-1">
                        <p className="text-dark truncate text-sm font-bold">
                          {order.studentName}
                        </p>
                      </div>
                      <span className="bg-dark shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-white">
                        {order.planName}
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
                      <Button
                        type="button"
                        variant="contained"
                        color="success"
                        className="min-h-11 w-full rounded-lg text-xs"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => approveMutation.mutate(order.id)}
                      >
                        Aprobar
                      </Button>
                      <Button
                        type="button"
                        variant="outlined"
                        color="danger"
                        className="min-h-11 w-full rounded-lg text-xs"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate(order.id)}
                      >
                        Rechazar
                      </Button>
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
                {new Intl.DateTimeFormat('es-CR', {
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
                      {formatTime(new Date(cls.startsAt))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-dark truncate text-sm font-medium">
                        {cls.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {cls.attendanceCount}
                      {cls.maxCapacity != null ? `/${cls.maxCapacity}` : ''}
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
                  const daysAgo = Math.floor(
                    (now.getTime() - new Date(student.createdAt).getTime()) /
                      86400000
                  );
                  return (
                    <div key={student.id} className="flex items-center gap-3">
                      <StudentInitials name={student.name ?? ''} />
                      <div className="min-w-0 flex-1">
                        <p className="text-dark truncate text-sm font-medium">
                          {student.name}
                        </p>
                        {student.planName && (
                          <span className="text-primary text-xs">
                            {student.planName}
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

// ─── Teacher dashboard ───────────────────────────────────────────────────────

type TeacherClassItem = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  attendanceCount: number;
  maxCapacity: number;
  skillLevel?: string;
};

type TeacherDashboardData = {
  userName: string;
  todayClasses: TeacherClassItem[];
  upcomingClasses: TeacherClassItem[];
  totalEnrolled: number;
  totalClasses: number;
};

function TeacherDashboard({ data }: { data: TeacherDashboardData }) {
  const now = new Date();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h1 className="text-dark text-2xl font-bold md:text-[28px]">
          {greeting()}, {data.userName?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-400 capitalize">{formatDate(now)}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        <div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-2 flex items-start justify-between md:mb-3">
            <p className="text-xs text-gray-400 md:text-sm">Clases Hoy</p>
            <Calendar className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
          </div>
          <p className="text-dark mb-1 text-2xl font-bold md:text-4xl">{data.todayClasses.length}</p>
          <p className="text-xs font-medium text-gray-400">programadas para hoy</p>
        </div>
        <div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-2 flex items-start justify-between md:mb-3">
            <p className="text-xs text-gray-400 md:text-sm">Alumnos Inscritos</p>
            <Users className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
          </div>
          <p className="text-dark mb-1 text-2xl font-bold md:text-4xl">{data.totalEnrolled}</p>
          <p className="text-xs font-medium text-gray-400">en tus clases activas</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:col-span-1 md:p-5">
          <div className="mb-2 flex items-start justify-between md:mb-3">
            <p className="text-xs text-gray-400 md:text-sm">Próximas Clases</p>
            <GraduationCap className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
          </div>
          <p className="text-dark mb-1 text-2xl font-bold md:text-4xl">{data.upcomingClasses.length}</p>
          <Link to="/classes" className="text-primary text-xs font-semibold hover:underline">
            Ver calendario →
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Today's classes */}
        <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-dark text-base font-bold">Mis Clases de Hoy</h2>
            <span className="text-xs text-gray-400">
              {new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'long' }).format(now)}
            </span>
          </div>
          {data.todayClasses.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin clases programadas hoy</p>
          ) : (
            <div className="space-y-3">
              {data.todayClasses.map((cls) => (
                <div key={cls.id} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 font-mono text-xs text-gray-400">
                    {formatTime(new Date(cls.startsAt))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-dark truncate text-sm font-medium">{cls.name}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${cls.attendanceCount >= cls.maxCapacity ? 'text-danger' : 'text-gray-400'}`}>
                    {cls.attendanceCount}/{cls.maxCapacity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming classes this week */}
        <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-dark text-base font-bold">Próximas Clases</h2>
            <Link to="/classes" className="text-primary text-sm font-semibold hover:underline">
              Ver todas →
            </Link>
          </div>
          {data.upcomingClasses.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin clases próximas esta semana</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingClasses.map((cls) => {
                const start = new Date(cls.startsAt);
                const dayShort = new Intl.DateTimeFormat('es-CR', { weekday: 'short' }).format(start).replace('.', '');
                return (
                  <div key={cls.id} className="flex items-center gap-3">
                    <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-50 px-1 py-1.5">
                      <span className="text-dark text-[11px] font-bold uppercase leading-none">
                        {dayShort}
                      </span>
                      <span className="mt-0.5 text-[10px] text-gray-400">
                        {formatTime(start)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-dark truncate text-sm font-medium">{cls.name}</p>
                      <p className="text-xs text-gray-400">{formatTime(start)} — {formatTime(new Date(cls.endsAt))}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium ${cls.attendanceCount >= cls.maxCapacity ? 'text-danger' : 'text-gray-400'}`}>
                      {cls.attendanceCount}/{cls.maxCapacity}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const apiClient = useApiClient();

  const { data: me, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => apiClient<MeResponse>('/api/v1/auth/me'),
  });

  const role = me?.role;
  const isStudentRole = role ? isStudent(role) : false;
  const isTeacherRole = role === 'TEACHER';

  const dashboardEndpoint = isStudentRole
    ? '/api/v1/dashboard/student'
    : isTeacherRole
      ? '/api/v1/dashboard/teacher'
      : '/api/v1/dashboard/admin';

  const { data: dashboardData, isLoading: dashboardLoading, isError } = useQuery<
    AdminDashboardData | TeacherDashboardData | StudentDashboardData
  >({
    queryKey: ['dashboard', role ?? ''],
    queryFn: () =>
      apiClient<AdminDashboardData | TeacherDashboardData | StudentDashboardData>(dashboardEndpoint),
    enabled: !!role,
  });

  if (meLoading || dashboardLoading) {
    return <InlineSpinner />;
  }

  if (isError || !dashboardData) {
    return (
      <div className="p-6">
        <p className="text-danger text-sm">
          Error al cargar los datos. Por favor, intenta de nuevo.
        </p>
      </div>
    );
  }

  if (isStudentRole) {
    return <StudentDashboard {...(dashboardData as StudentDashboardData)} />;
  }

  if (isTeacherRole) {
    return <TeacherDashboard data={dashboardData as TeacherDashboardData} />;
  }

  return <AdminDashboard data={dashboardData as AdminDashboardData} />;
}
