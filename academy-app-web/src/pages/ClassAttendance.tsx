import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';

import { LEVEL_LABELS } from '@/components/dashboard/classes/classes.types';
import { DatePicker } from '@/components/ui/DatePicker';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getInitials } from '@/utils/general';

type Slot = { dayOfWeek: number };
type Cls = {
  id: string;
  name: string;
  teacherId: string;
  skillLevel: string;
  slots: Slot[];
  oneOffDate?: string | null; // "YYYY-MM-DD" si es clase única
};
type RosterStudent = { id: string; name: string; avatarUrl?: string | null };

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// "YYYY-MM-DD" → día de la semana en convención del schema (1=Lun … 7=Dom).
function dayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const js = new Date(y, m - 1, d).getDay(); // 0=Dom … 6=Sáb
  return js === 0 ? 7 : js;
}

export default function ClassAttendance() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { role, userId } = useOutletContext<{ role: string; userId: string }>();
  const [searchParams] = useSearchParams();

  const [date, setDate] = useState(today());
  const [classId, setClassId] = useState(searchParams.get('classId') ?? '');
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: classesData } = useQuery<{ classes: Cls[] }>({
    queryKey: ['classes'],
    queryFn: () => apiClient<{ classes: Cls[] }>('/api/v1/classes'),
  });

  const dow = dayOfWeekFromDate(date);

  // Un profesor solo ve sus propias clases. Solo se muestran las clases que
  // ocurren en la fecha elegida: las recurrentes que se imparten ese día de la
  // semana, y las clases únicas cuya fecha coincide exactamente.
  const classes = useMemo(() => {
    const all = classesData?.classes ?? [];
    const mine = role === 'TEACHER' ? all.filter((c) => c.teacherId === userId) : all;
    return mine.filter((c) =>
      c.oneOffDate ? c.oneOffDate === date : c.slots?.some((s) => s.dayOfWeek === dow)
    );
  }, [classesData, role, userId, dow, date]);

  // Si la clase seleccionada ya no se imparte el día elegido, se limpia.
  useEffect(() => {
    if (classId && !classes.some((c) => c.id === classId)) {
      setClassId('');
    }
  }, [classes, classId]);

  const attKey = ['session-attendance', classId, date] as const;
  const { data, isLoading } = useQuery<{
    present: string[];
    roster: RosterStudent[];
  }>({
    queryKey: attKey,
    queryFn: () =>
      apiClient<{ present: string[]; roster: RosterStudent[] }>(
        `/api/v1/session-attendance?classId=${classId}&date=${date}`
      ),
    enabled: !!classId,
  });

  const presentSet = useMemo(() => new Set(data?.present ?? []), [data]);
  const roster = data?.roster ?? [];

  async function toggle(studentId: string, present: boolean) {
    if (!classId) return;
    setSavingId(studentId);
    try {
      await apiClient('/api/v1/session-attendance', {
        method: present ? 'DELETE' : 'POST',
        body: JSON.stringify({ studentId, classId, date }),
      });
      await queryClient.invalidateQueries({ queryKey: attKey });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-dark text-2xl font-bold md:text-3xl">Asistencia</h1>
        {classId && (
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold">
            <Users className="h-4 w-4" /> {presentSet.size} asistieron
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <DatePicker label="Fecha" value={date} onChange={setDate} />
        <SelectMenu
          className="sm:w-72"
          label="Clase"
          value={classId}
          onChange={setClassId}
          placeholder={classes.length === 0 ? 'Sin clases este día' : 'Seleccionar clase'}
          disabled={classes.length === 0}
          options={classes.map((c) => ({
            value: c.id,
            label: `${c.name} · ${LEVEL_LABELS[c.skillLevel] ?? c.skillLevel}`,
          }))}
        />
      </div>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          No hay clases programadas para este día.
        </div>
      ) : !classId ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          Selecciona una clase para pasar lista.
        </div>
      ) : isLoading ? (
        <InlineSpinner />
      ) : roster.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          No hay alumnos inscritos en esta clase este mes.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((s) => {
            const present = presentSet.has(s.id);
            const saving = savingId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                title={present ? 'Clic para quitar la asistencia' : 'Clic para marcar asistencia'}
                onClick={() => toggle(s.id, present)}
                disabled={saving}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm active:scale-[0.99] disabled:cursor-wait disabled:opacity-70',
                  present
                    ? 'border-primary bg-primary/5 hover:bg-primary/10'
                    : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-gray-50'
                )}
              >
                {s.avatarUrl ? (
                  <img
                    src={s.avatarUrl}
                    alt={s.name}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      present ? 'bg-primary' : 'bg-dark'
                    )}
                  >
                    <span className="text-xs font-bold text-white">{getInitials(s.name)}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-dark truncate text-sm font-medium">{s.name}</p>
                </div>
                {saving ? (
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
          })}
        </div>
      )}
    </div>
  );
}
