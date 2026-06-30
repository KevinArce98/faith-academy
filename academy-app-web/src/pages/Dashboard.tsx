import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DollarSign,
  GraduationCap,
  Hourglass,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { LEVEL_LABELS } from '@/components/dashboard/classes/classes.types';
import { Button } from '@/components/ui/Button';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { MeResponse } from '@/lib/interfaces/auth';
import { isStudent } from '@/lib/roles';
import { formatDate, formatPrice, getInitials, greeting } from '@/utils/general';
import { formatSlotRange } from '@/utils/schedule';

// ─── Types ──────────────────────────────────────────────────────────────────

type PendingPayment = {
  subscriptionId: string | null;
  studentId: string;
  studentName: string;
  studentEmail: string;
  planId: string;
  planName: string;
  amount: number;
  status: 'pending' | 'expired';
};

type ClassStat = {
  classId: string;
  className: string;
  teacherName: string;
  students: number;
  revenue: number;
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
  monthCollected: number;
  monthPending: number;
  teacherPayout: number;
  pendingCount: number;
  pendingPayments: PendingPayment[];
  classStats: ClassStat[];
  newStudents: NewStudent[];
};

type TeacherSlot = { dayOfWeek: number; startTime: string; endTime: string };

type TeacherClass = {
  id: string;
  name: string;
  skillLevel: string;
  schedule: string | null;
  slots: TeacherSlot[];
  oneOffDate: string | null;
  students: number;
  sessionsGiven: number;
  avgAttendance: number;
};

type TeacherDashboardData = {
  userName: string;
  totalClasses: number;
  totalStudents: number;
  hoursThisMonth: number;
  classes: TeacherClass[];
};

export type StudentDashboardData = {
  userName: string;
  enrollmentFee: number | null;
  subscription: { planName: string; amount: number; isPaid: boolean } | null;
  planActive: boolean;
  planExpired: boolean;
  expiresAt: string | null;
  classesThisMonth: { id: string; name: string }[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StudentInitials({ name }: { name: string }) {
  return (
    <div className="bg-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
      <span className="text-xs font-bold text-white">{getInitials(name)}</span>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  sub,
  subColor = 'text-gray-400',
  valueColor = 'text-dark',
}: {
  label: string;
  value: string;
  icon: typeof Users;
  sub?: string;
  subColor?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-2 flex items-start justify-between md:mb-3">
        <p className="text-xs text-gray-400 md:text-sm">{label}</p>
        <Icon className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
      </div>
      <p className={`mb-1 text-2xl font-bold md:text-4xl ${valueColor}`}>{value}</p>
      {sub && <p className={`text-xs font-medium ${subColor}`}>● {sub}</p>}
    </div>
  );
}

// ─── Admin dashboard ─────────────────────────────────────────────────────────

function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const now = new Date();

  // 'pending' → marca pagada la mensualidad de este mes; 'expired' → crea/renueva
  // la mensualidad del mes actual con su plan (nuevo ciclo de aniversario).
  const payMutation = useMutation({
    mutationFn: (p: PendingPayment) =>
      p.subscriptionId
        ? apiClient(`/api/v1/subscriptions/${p.subscriptionId}/pay`, {
            method: 'PATCH',
            body: JSON.stringify({ isPaid: true }),
          })
        : apiClient('/api/v1/subscriptions', {
            method: 'POST',
            body: JSON.stringify({
              studentId: p.studentId,
              planId: p.planId,
              isPaid: true,
            }),
          }),
    onSuccess: () => {
      for (const key of ['dashboard', 'students', 'subscriptions']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h1 className="text-dark text-2xl font-bold md:text-[28px]">
          {greeting()}, {data.userName?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-400 capitalize">{formatDate(now)}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        <Kpi
          label="Alumnos Activos"
          value={data.activeStudents.toLocaleString()}
          icon={Users}
          sub={`+${data.newStudents.length} nuevos esta semana`}
          subColor="text-success"
        />
        <Kpi
          label="Recaudado del Mes"
          value={formatPrice(data.monthCollected)}
          icon={DollarSign}
          sub="mensualidades pagadas"
          subColor="text-success"
        />
        <Kpi
          label="Por Cobrar"
          value={formatPrice(data.monthPending)}
          icon={Clock}
          sub={`${data.pendingCount} mensualidades`}
          subColor="text-warning"
          valueColor="text-warning"
        />
        <Kpi
          label="Pago a Profes"
          value={formatPrice(data.teacherPayout)}
          icon={GraduationCap}
          sub="repartido este mes"
        />
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
        {/* Pending mensualidades */}
        <div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-dark text-base font-bold">Mensualidades Pendientes</h2>
            <Link to="/students" className="text-primary text-sm font-semibold hover:underline">
              Ver alumnos →
            </Link>
          </div>

          {data.pendingPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Todas las mensualidades del mes están al día 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {data.pendingPayments.slice(0, 8).map((p) => (
                <div
                  key={p.studentId}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
                >
                  <StudentInitials name={p.studentName} />
                  <div className="min-w-0 flex-1">
                    <p className="text-dark flex items-center gap-2 truncate text-sm font-medium">
                      {p.studentName}
                      {p.status === 'expired' && (
                        <span className="bg-danger/10 text-danger shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                          Vencido
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {p.planName} · {formatPrice(p.amount)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="contained"
                    color="success"
                    className="shrink-0 rounded-lg px-3 py-1 text-xs"
                    disabled={payMutation.isPending}
                    onClick={() => payMutation.mutate(p)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />{' '}
                    {p.status === 'expired' ? 'Renovar' : 'Pagado'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 lg:gap-6">
          {/* Class stats */}
          <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-dark text-base font-bold">Ingreso por Clase</h2>
              <BarChart3 className="h-4 w-4 text-gray-300" />
            </div>
            {data.classStats.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Sin datos este mes</p>
            ) : (
              <div className="space-y-3">
                {data.classStats.map((cl) => (
                  <div key={cl.classId} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-dark truncate text-sm font-medium">{cl.className}</p>
                      <p className="truncate text-xs text-gray-400">
                        {cl.teacherName || 'Sin profesor'} · {cl.students}{' '}
                        {cl.students === 1 ? 'alumno' : 'alumnos'}
                      </p>
                    </div>
                    <span className="text-dark shrink-0 text-sm font-semibold">
                      {formatPrice(cl.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New students */}
          <div className="flex-1 rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
            <h2 className="text-dark mb-4 text-base font-bold">Alumnos Nuevos esta Semana</h2>
            {data.newStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Sin alumnos nuevos</p>
            ) : (
              <div className="space-y-3">
                {data.newStudents.map((student) => (
                  <div key={student.id} className="flex items-center gap-3">
                    <StudentInitials name={student.name ?? ''} />
                    <div className="min-w-0 flex-1">
                      <p className="text-dark truncate text-sm font-medium">{student.name}</p>
                      {student.planName && (
                        <span className="text-primary text-xs">{student.planName}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Teacher dashboard ───────────────────────────────────────────────────────

const DAY_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// JS getDay (0=Dom..6=Sáb) → convención del schema (1=Lun..7=Dom).
function todayDow(): number {
  return ((new Date().getDay() + 6) % 7) + 1;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function TeacherDashboard({ data }: { data: TeacherDashboardData }) {
  const now = new Date();
  const dow = todayDow();
  const todayStr = ymd(now);

  // Semana actual (lunes a domingo) para ubicar las clases únicas.
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = ymd(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekEnd = ymd(sunday);

  // Clases de hoy: recurrentes en el día de hoy, y clases únicas con fecha == hoy.
  const todayClasses = data.classes
    .map((cls) => {
      const slot = cls.slots.find((s) => s.dayOfWeek === dow);
      if (!slot) return null;
      if (cls.oneOffDate && cls.oneOffDate !== todayStr) return null;
      return { cls, slot };
    })
    .filter((x): x is { cls: TeacherClass; slot: TeacherSlot } => x !== null)
    .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));

  // Horario semanal: recurrentes siempre; clases únicas solo si caen esta semana.
  const byDay = new Map<number, { name: string; slot: TeacherSlot }[]>();
  for (const cls of data.classes) {
    if (cls.oneOffDate && (cls.oneOffDate < weekStart || cls.oneOffDate > weekEnd)) continue;
    for (const slot of cls.slots) {
      const list = byDay.get(slot.dayOfWeek) ?? [];
      list.push({ name: cls.name, slot });
      byDay.set(slot.dayOfWeek, list);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h1 className="text-dark text-2xl font-bold md:text-[28px]">
          {greeting()}, {data.userName?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-400 capitalize">{formatDate(now)}</p>
      </div>

      {/* KPIs operativos — sin finanzas */}
      <div className="grid grid-cols-3 gap-3 md:gap-5">
        <Kpi label="Tus Clases" value={String(data.totalClasses)} icon={GraduationCap} />
        <Kpi
          label="Alumnos Inscritos"
          value={String(data.totalStudents)}
          icon={Users}
          sub="este mes"
        />
        <Kpi
          label="Horas del Mes"
          value={`${data.hoursThisMonth} h`}
          icon={Hourglass}
          sub="sesiones dadas"
        />
      </div>

      {/* Clases de hoy + Pasar lista */}
      <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-dark text-base font-bold">Clases de Hoy</h2>
          <CalendarDays className="h-4 w-4 text-gray-300" />
        </div>
        {todayClasses.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No tienes clases hoy 🎉</p>
        ) : (
          <div className="space-y-2">
            {todayClasses.map(({ cls, slot }) => (
              <div key={cls.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-dark truncate text-sm font-medium">
                    {cls.name} · {LEVEL_LABELS[cls.skillLevel] ?? cls.skillLevel}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {formatSlotRange(slot.startTime, slot.endTime)} · {cls.students}{' '}
                    {cls.students === 1 ? 'alumno' : 'alumnos'}
                  </p>
                </div>
                <Link to={`/class-attendance?classId=${cls.id}`}>
                  <Button
                    type="button"
                    variant="contained"
                    className="shrink-0 rounded-lg px-3 py-1 text-xs"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" /> Pasar lista
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Horario semanal */}
        <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
          <h2 className="text-dark mb-4 text-base font-bold">Mi Horario Semanal</h2>
          {data.classes.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No tienes clases asignadas</p>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const items = byDay.get(d);
                if (!items?.length) return null;
                return (
                  <div key={d} className="flex gap-3">
                    <span
                      className={cn(
                        'w-20 shrink-0 text-xs font-semibold',
                        d === dow ? 'text-primary' : 'text-gray-400'
                      )}
                    >
                      {DAY_LABELS[d]}
                    </span>
                    <div className="flex-1 space-y-1">
                      {items
                        .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime))
                        .map((it, i) => (
                          <p key={i} className="text-dark text-sm">
                            {formatSlotRange(it.slot.startTime, it.slot.endTime)}{' '}
                            <span className="text-gray-400">· {it.name}</span>
                          </p>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resumen de asistencia */}
        <div className="rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-dark text-base font-bold">Asistencia del Mes</h2>
            <BarChart3 className="h-4 w-4 text-gray-300" />
          </div>
          {data.classes.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin datos este mes</p>
          ) : (
            <div className="space-y-3">
              {data.classes.map((cls) => (
                <div key={cls.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-dark truncate text-sm font-medium">{cls.name}</p>
                    <p className="truncate text-xs text-gray-400">
                      {cls.sessionsGiven} {cls.sessionsGiven === 1 ? 'sesión' : 'sesiones'} ·{' '}
                      {cls.students} inscritos
                    </p>
                  </div>
                  <span className="text-primary inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
                    <Users className="h-4 w-4" /> {cls.avgAttendance}
                  </span>
                </div>
              ))}
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

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError,
  } = useQuery<AdminDashboardData | TeacherDashboardData | StudentDashboardData>({
    queryKey: ['dashboard', role ?? ''],
    queryFn: () =>
      apiClient<AdminDashboardData | TeacherDashboardData | StudentDashboardData>(
        dashboardEndpoint
      ),
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
