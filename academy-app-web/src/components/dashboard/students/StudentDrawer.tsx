import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useApiClient } from '@/lib/api';
import { slideInRight } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errorMessages';
import { type Student, currentSubscription } from '@/lib/interfaces/students';
import { useEnrollmentStatusFor } from '@/lib/queries';
import { qk } from '@/lib/queryKeys';
import { formatPrice, getInitials } from '@/utils/general';

const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-CR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));

// "YYYY-MM" → "junio 2026"
const periodLabel = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
};

type HistoryMonth = {
  period: string;
  subscription: { planName: string; amount: number; isPaid: boolean } | null;
  enrolledClasses: { classId: string; className: string }[];
  sessions: { date: string; className: string }[];
};

export function StudentDrawer({ student, onClose }: { student: Student; onClose: () => void }) {
  const [tab, setTab] = useState<'info' | 'pagos' | 'asistencia' | 'progreso'>('info');
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  const { data: history, isLoading: historyLoading } = useQuery<{ months: HistoryMonth[] }>({
    queryKey: ['student-history', student.id],
    queryFn: () => apiClient<{ months: HistoryMonth[] }>(`/api/v1/students/${student.id}/history`),
    enabled: tab === 'asistencia',
  });

  const { data: enrollmentStatus } = useEnrollmentStatusFor(student.id, tab === 'info');

  const markPaidMutation = useMutation({
    mutationFn: () =>
      apiClient('/api/v1/payments/enrollment/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ studentId: student.id }),
      }),
    onSuccess: () => {
      setEnrollmentError(null);
      queryClient.invalidateQueries({ queryKey: qk.enrollmentStatus(student.id) });
      queryClient.invalidateQueries({ queryKey: qk.payments });
    },
    onError: (err) => setEnrollmentError(getErrorMessage(err, 'No se pudo marcar la matrícula.')),
  });

  const sub = currentSubscription(student);

  useScrollLock(true);

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-40 m-0 flex max-h-[85vh] flex-col rounded-t-[20px] bg-white shadow-2xl md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:max-h-full md:min-h-screen md:w-96 md:rounded-none md:border-l md:border-gray-100"
      variants={slideInRight}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Mobile drag indicator */}
      <div className="flex justify-center pt-3 pb-1 md:hidden">
        <div className="h-1 w-10 rounded-full bg-gray-300" />
      </div>
      <div className="flex justify-end border-b border-gray-50 p-4">
        <Button variant="text" color="neutral" onClick={onClose} className="h-auto p-1">
          <X className="hover:text-dark h-5 w-5 text-gray-400" />
        </Button>
      </div>

      {/* Avatar + info */}
      <div className="flex flex-col items-center gap-2 border-b border-gray-50 px-6 pt-4 pb-5">
        {student.avatarUrl ? (
          <img
            src={student.avatarUrl}
            alt={student.name}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="bg-primary flex h-16 w-16 items-center justify-center rounded-full">
            <span className="text-xl font-bold text-white">{getInitials(student.name)}</span>
          </div>
        )}
        <h3 className="text-dark text-lg font-bold">{student.name}</h3>
        <p className="text-sm text-gray-400">{student.email}</p>
        {student.isActive ? (
          <span className="bg-success/10 text-success rounded-full px-3 py-1 text-xs font-semibold">
            ACTIVO
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-400">
            INACTIVO
          </span>
        )}
        <p className="text-xs text-gray-400">Miembro desde {monthLabel(student.createdAt)}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
        {(['info', 'pagos', 'asistencia', 'progreso'] as const).map((t) => (
          <Button
            key={t}
            onClick={() => setTab(t)}
            variant="text"
            color="neutral"
            className={cn(
              'h-auto rounded-none border-b-2 px-3 py-2.5 text-sm font-medium capitalize',
              tab === t
                ? 'border-primary text-primary hover:bg-transparent'
                : 'hover:text-dark border-transparent text-gray-400 hover:bg-transparent'
            )}
          >
            {t === 'info' ? 'Informacion' : t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {tab === 'info' && (
          <>
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <h4 className="text-dark text-sm font-semibold">Mensualidad del mes</h4>
              {sub ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="bg-dark rounded-full px-2.5 py-1 text-xs font-medium text-white">
                      {sub.plan.name}
                    </span>
                    <span className="text-dark text-sm font-bold">{formatPrice(sub.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Estado del pago</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        sub.isPaid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      )}
                    >
                      {sub.isPaid ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">Sin plan asignado</p>
              )}
            </div>

            <div className="space-y-2 rounded-xl bg-gray-50 p-4">
              <h4 className="text-dark text-sm font-semibold">Matrícula</h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Monto</span>
                <span className="text-dark font-semibold">
                  {student.enrollmentFee != null ? formatPrice(student.enrollmentFee) : '—'}
                </span>
              </div>
              {student.enrolledAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Fecha</span>
                  <span className="text-dark">
                    {new Intl.DateTimeFormat('es-CR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(student.enrolledAt))}
                  </span>
                </div>
              )}
              {enrollmentStatus && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Estado</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      enrollmentStatus.active
                        ? 'bg-success/10 text-success'
                        : enrollmentStatus.pending
                          ? 'bg-warning/10 text-warning'
                          : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {enrollmentStatus.active
                      ? 'Al día'
                      : enrollmentStatus.pending
                        ? 'En revisión'
                        : 'Pendiente'}
                  </span>
                </div>
              )}
              {enrollmentStatus?.active && enrollmentStatus.expiresAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Vence</span>
                  <span className="text-dark">
                    {new Intl.DateTimeFormat('es-CR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(enrollmentStatus.expiresAt))}
                  </span>
                </div>
              )}
              {enrollmentError && <p className="text-danger text-xs">{enrollmentError}</p>}
              {enrollmentStatus &&
                !enrollmentStatus.active &&
                !enrollmentStatus.pending &&
                student.enrollmentFee != null &&
                student.enrollmentFee > 0 && (
                  <Button
                    variant="outlined"
                    color="primary"
                    className="h-9 w-full rounded-lg text-xs"
                    disabled={markPaidMutation.isPending}
                    onClick={() => markPaidMutation.mutate()}
                  >
                    {markPaidMutation.isPending ? 'Guardando...' : 'Marcar matrícula pagada'}
                  </Button>
                )}
            </div>
          </>
        )}
        {tab === 'pagos' && (
          <div className="space-y-3">
            {student.subscriptions.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Sin pagos registrados</p>
            ) : (
              student.subscriptions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-3"
                >
                  <div>
                    <p className="text-dark text-sm font-medium">{s.plan.name}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {monthLabel(s.period)} · {formatPrice(s.amount)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-semibold',
                      s.isPaid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    )}
                  >
                    {s.isPaid ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        {tab === 'asistencia' &&
          (historyLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="sm" />
            </div>
          ) : !history || history.months.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">Sin historial todavía</p>
          ) : (
            <div className="space-y-3">
              {history.months.map((m) => (
                <div key={m.period} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-dark text-sm font-bold">{periodLabel(m.period)}</p>

                  {m.subscription ? (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {m.subscription.planName} · {formatPrice(m.subscription.amount)} ·{' '}
                      <span className={m.subscription.isPaid ? 'text-success' : 'text-warning'}>
                        {m.subscription.isPaid ? 'Pagado' : 'Pendiente'}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-gray-400">Sin mensualidad este mes</p>
                  )}

                  {m.enrolledClasses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.enrolledClasses.map((c) => (
                        <span
                          key={c.classId}
                          className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium"
                        >
                          {c.className}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-400">
                    {m.sessions.length}{' '}
                    {m.sessions.length === 1 ? 'asistencia registrada' : 'asistencias registradas'}
                  </p>
                </div>
              ))}
            </div>
          ))}
        {tab === 'progreso' && (
          <p className="py-12 text-center text-sm text-gray-400">Progreso disponible pronto</p>
        )}
      </div>
    </motion.div>
  );
}
