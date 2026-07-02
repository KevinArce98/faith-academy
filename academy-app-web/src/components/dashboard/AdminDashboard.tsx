import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Kpi } from '@/components/dashboard/Kpi';
import { StudentInitials } from '@/components/dashboard/StudentInitials';
import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/lib/api';
import type { AdminDashboardData, PendingPayment } from '@/lib/interfaces/dashboard';
import { qk } from '@/lib/queryKeys';
import { formatDate, formatPrice, greeting } from '@/utils/general';

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
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
      for (const key of [['dashboard'], qk.students, ['subscriptions']]) {
        queryClient.invalidateQueries({ queryKey: key });
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
