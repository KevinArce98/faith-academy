import { useQuery } from '@tanstack/react-query';
import { ChevronDown, GraduationCap, User, Users } from 'lucide-react';
import { useState } from 'react';

import { MonthPicker } from '@/components/ui/MonthPicker';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/utils/general';

type StudentContribution = {
  studentId: string;
  studentName: string;
  planName: string;
  amount: number;
};

type ClassLine = {
  classId: string;
  className: string;
  amount: number;
  students: number;
  studentList: StudentContribution[];
};

type TeacherPayout = {
  teacherId: string;
  teacherName: string;
  total: number;
  hoursWorked: number;
  cost: number;
  net: number;
  classes: ClassLine[];
};

type PayoutsResponse = {
  period: string;
  totals: {
    collected: number;
    pending: number;
    allocated: number;
    unallocated: number;
  };
  payouts: TeacherPayout[];
};

function currentMonth(): string {
  const now = new Date();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${m}`;
}

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p
        className={
          tone === 'success'
            ? 'text-success mt-1 text-2xl font-bold'
            : tone === 'warning'
              ? 'text-warning mt-1 text-2xl font-bold'
              : 'text-dark mt-1 text-2xl font-bold'
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function Payouts() {
  const apiClient = useApiClient();
  const [period, setPeriod] = useState(currentMonth());
  const [openClasses, setOpenClasses] = useState<Set<string>>(new Set());

  function toggleClass(classId: string) {
    setOpenClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  const { data, isLoading, isError } = useQuery<PayoutsResponse>({
    queryKey: ['payouts', period],
    queryFn: () => apiClient<PayoutsResponse>(`/api/v1/payouts?period=${period}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h1 className="text-dark text-2xl font-bold md:text-3xl">Pago a profesores</h1>

        <MonthPicker label="Mes" value={period} onChange={setPeriod} />
      </div>

      {isLoading ? (
        <InlineSpinner />
      ) : isError || !data ? (
        <div className="text-danger p-6 text-center text-sm">
          Error al cargar el reporte. Intenta de nuevo.
        </div>
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Recaudado (pagado)"
              value={formatPrice(data.totals.collected)}
              tone="success"
            />
            <StatCard label="Por cobrar" value={formatPrice(data.totals.pending)} tone="warning" />
            <StatCard label="Repartido a profes" value={formatPrice(data.totals.allocated)} />
            <StatCard
              label="Sin repartir (sin inscripción)"
              value={formatPrice(data.totals.unallocated)}
            />
          </div>

          {/* Pago por profesor */}
          {data.payouts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
              No hay pagos que repartir este mes. Registra mensualidades pagadas e inscripciones
              para ver el cálculo.
            </div>
          ) : (
            <div className="space-y-3">
              {data.payouts.map((t) => (
                <div
                  key={t.teacherId}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                        <GraduationCap className="text-primary h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-dark font-bold">{t.teacherName || 'Sin profesor'}</p>
                        <p className="text-xs text-gray-400">
                          {t.classes.length} {t.classes.length === 1 ? 'clase' : 'clases'}
                          {t.hoursWorked > 0 && ` · ${t.hoursWorked}h trabajadas`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end gap-5 text-right">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          Ingresos
                        </p>
                        <p className="text-dark text-lg font-bold">{formatPrice(t.total)}</p>
                      </div>
                      {t.cost > 0 && (
                        <>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              Costo
                            </p>
                            <p className="text-lg font-bold text-gray-600">{formatPrice(t.cost)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              Neto
                            </p>
                            <p
                              className={cn(
                                'text-lg font-bold',
                                t.net >= 0 ? 'text-success' : 'text-danger'
                              )}
                            >
                              {formatPrice(t.net)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {t.classes.map((cl) => {
                      const isOpen = openClasses.has(cl.classId);
                      return (
                        <div key={cl.classId}>
                          <button
                            type="button"
                            onClick={() => toggleClass(cl.classId)}
                            className="hover:bg-gray-50/80 flex w-full items-center justify-between px-5 py-3 text-sm transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-dark font-medium">{cl.className}</span>
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                <Users className="h-3 w-3" /> {cl.students}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-dark font-semibold">
                                {formatPrice(cl.amount)}
                              </span>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 text-gray-400 transition-transform',
                                  isOpen && 'rotate-180'
                                )}
                              />
                            </div>
                          </button>

                          {isOpen && cl.studentList.length > 0 && (
                            <div className="bg-gray-50/60 divide-y divide-gray-100 border-t border-gray-100">
                              {cl.studentList
                                .sort((a, b) => b.amount - a.amount)
                                .map((sc) => (
                                  <div
                                    key={sc.studentId}
                                    className="flex items-center justify-between px-5 py-2.5"
                                  >
                                    <div className="flex items-center gap-2 text-sm">
                                      <User className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                                      <span className="text-dark">{sc.studentName}</span>
                                      {sc.planName && (
                                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                                          {sc.planName}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">
                                      {formatPrice(sc.amount)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
