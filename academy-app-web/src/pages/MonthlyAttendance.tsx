import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Lock, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { LEVEL_LABELS } from '@/components/dashboard/classes/classes.types';
import { Input } from '@/components/ui/Input';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errorMessages';
import { formatPrice, getInitials } from '@/utils/general';

type Cls = {
  id: string;
  name: string;
  teacherId: string;
  skillLevel: string;
};
type StudentLite = { id: string; name: string; email: string };
type Plan = { classesPerWeek: number; isSingleClass: boolean };
type Subscription = {
  studentId: string;
  isPaid: boolean;
  paidAt: string | null;
  amount: number;
  plan: Plan;
  student: StudentLite;
};
type AttendanceRecord = { studentId: string; classId: string; sessionDate: string | null };

function currentMonth(): string {
  const now = new Date();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${m}`;
}

export default function MonthlyAttendance() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState(currentMonth());
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: classesData } = useQuery<{ classes: Cls[] }>({
    queryKey: ['classes'],
    queryFn: () => apiClient<{ classes: Cls[] }>('/api/v1/classes'),
  });

  const { data: subsData } = useQuery<{ subscriptions: Subscription[] }>({
    queryKey: ['subscriptions', period],
    queryFn: () =>
      apiClient<{ subscriptions: Subscription[] }>(`/api/v1/subscriptions?period=${period}`),
  });

  const attendanceKey = ['monthly-attendance', period, classId] as const;
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery<{
    records: AttendanceRecord[];
  }>({
    queryKey: attendanceKey,
    queryFn: () =>
      apiClient<{ records: AttendanceRecord[] }>(
        `/api/v1/monthly-attendance?period=${period}&classId=${classId}`
      ),
    enabled: !!classId,
  });

  // Todos los enrollments del período (sin filtro de clase) para contar por alumno.
  const { data: allEnrollData } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['monthly-attendance-all', period],
    queryFn: () =>
      apiClient<{ records: AttendanceRecord[] }>(`/api/v1/monthly-attendance?period=${period}`),
  });

  const enrollCountByStudent = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allEnrollData?.records ?? []) {
      m.set(r.studentId, (m.get(r.studentId) ?? 0) + 1);
    }
    return m;
  }, [allEnrollData]);

  const attendanceByStudent = useMemo(
    () => new Map((attendanceData?.records ?? []).map((r) => [r.studentId, r] as const)),
    [attendanceData]
  );

  const classes = classesData?.classes ?? [];
  // students = subs completas (con plan y paidAt) filtradas a pagadas + búsqueda
  const students = useMemo(() => {
    const paid = (subsData?.subscriptions ?? []).filter((s) => s.isPaid);
    const q = search.toLowerCase();
    return paid.filter(
      (s) => s.student.name.toLowerCase().includes(q) || s.student.email.toLowerCase().includes(q)
    );
  }, [subsData, search]);

  function formatPaidAt(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });
  }

  function allowanceLabel(plan: Plan): string {
    if (plan.isSingleClass) return '1';
    return plan.classesPerWeek === 0 ? '∞' : String(plan.classesPerWeek);
  }

  function formatSessionDate(iso: string): string {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });
  }

  async function toggle(studentId: string, present: boolean, locked: boolean) {
    if (!classId || locked) return;
    setSavingId(studentId);
    setError(null);
    try {
      await apiClient('/api/v1/monthly-attendance', {
        method: present ? 'DELETE' : 'POST',
        body: JSON.stringify({ studentId, classId, period }),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: attendanceKey }),
        queryClient.invalidateQueries({
          queryKey: ['monthly-attendance-all', period],
        }),
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo inscribir al alumno.'));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-dark text-2xl font-bold md:text-3xl">Inscripciones del mes</h1>
        {classId && (
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold">
            <Users className="h-4 w-4" /> {attendanceByStudent.size} inscritos
          </span>
        )}
      </div>

      {error && (
        <div className="border-danger/20 bg-danger/10 text-danger rounded-xl border px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <MonthPicker label="Mes" value={period} onChange={setPeriod} />
        <SelectMenu
          className="sm:w-72"
          label="Clase"
          value={classId}
          onChange={setClassId}
          placeholder="Seleccionar clase"
          options={classes.map((c) => ({
            value: c.id,
            label: `${c.name} · ${LEVEL_LABELS[c.skillLevel] ?? c.skillLevel}`,
          }))}
        />
        <div className="flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno..."
            startIcon={<Search className="h-4 w-4" />}
            label="Buscar"
          />
        </div>
      </div>

      {!classId ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          Selecciona una clase para gestionar las inscripciones del mes.
        </div>
      ) : attendanceLoading ? (
        <InlineSpinner />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {students.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-gray-400">
              Ningún alumno tiene la mensualidad pagada este mes.
            </p>
          ) : (
            students.map((sub) => {
              const s = sub.student;
              const record = attendanceByStudent.get(s.id);
              const present = !!record;
              const locked = !!record?.sessionDate;
              const saving = savingId === s.id;
              const enrolled = enrollCountByStudent.get(s.id) ?? 0;
              const cap = allowanceLabel(sub.plan);
              return (
                <button
                  key={s.id}
                  type="button"
                  title={
                    locked
                      ? 'Reserva de clase suelta: no se puede cambiar'
                      : present
                        ? 'Clic para quitar la inscripción'
                        : 'Clic para inscribir en la clase'
                  }
                  onClick={() => toggle(s.id, present, locked)}
                  disabled={saving || locked}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-left transition-all disabled:cursor-wait',
                    locked ? 'cursor-default' : 'cursor-pointer hover:shadow-sm active:scale-[0.99] disabled:opacity-70',
                    present
                      ? 'border-primary bg-primary/5 hover:bg-primary/10'
                      : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-gray-50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      present ? 'bg-primary' : 'bg-dark'
                    )}
                  >
                    <span className="text-xs font-bold text-white">{getInitials(s.name)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-dark truncate text-sm font-medium">{s.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                      {locked ? (
                        <span className="text-primary font-medium">
                          Solo esta clase · {formatSessionDate(record.sessionDate!)}
                        </span>
                      ) : (
                        <>
                          <span>{formatPrice(sub.amount)}</span>
                          {sub.paidAt && (
                            <>
                              <span>·</span>
                              <span>Pagó {formatPaidAt(sub.paidAt)}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>
                            {enrolled} de {cap} clase{cap !== '1' ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {locked ? (
                    <Lock className="h-4 w-4 shrink-0 text-primary" />
                  ) : saving ? (
                    <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
                  ) : (
                    <div
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                        present
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 text-transparent'
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
