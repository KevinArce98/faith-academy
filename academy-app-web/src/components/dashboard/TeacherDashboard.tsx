import { BarChart3, CalendarDays, ClipboardCheck, GraduationCap, Hourglass, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Kpi } from '@/components/dashboard/Kpi';
import { LEVEL_LABELS } from '@/components/dashboard/classes/classes.types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type {
  TeacherClass,
  TeacherDashboardData,
  TeacherSlot,
} from '@/lib/interfaces/dashboard';
import { formatDate, greeting } from '@/utils/general';
import { formatSlotRange } from '@/utils/schedule';

const DAY_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// JS getDay (0=Dom..6=Sáb) → convención del schema (1=Lun..7=Dom).
function todayDow(): number {
  return ((new Date().getDay() + 6) % 7) + 1;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TeacherDashboard({ data }: { data: TeacherDashboardData }) {
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
