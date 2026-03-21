'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, List, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { cn } from '@/lib/cn';
import { modalVariants } from '@/lib/animations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

const DAYS_ES = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 - 21:00

type ClsCount = { attendances: number };
type Cls = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  maxCapacity: number;
  skillLevel: string;
  _count: ClsCount;
};

type Teacher = { id: string; name: string };

type ClassesClientProps = {
  classes: Cls[];
  teachers: Teacher[];
  weekStart: string;
};

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'bg-success/20 text-success border-success/30',
  INTERMEDIATE: 'bg-primary/20 text-primary border-primary/30',
  ADVANCED: 'bg-warning/20 text-warning border-warning/30',
  MASTER: 'bg-dark/20 text-dark border-dark/30',
};

const DAYS_ABBR = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function NewClassModal({
  teachers,
  onClose,
}: {
  teachers: Teacher[];
  onClose: () => void;
}) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  function toggleDay(i: number) {
    setSelectedDays((prev) =>
      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={onClose}
    >
      <motion.div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl md:max-w-lg md:rounded-2xl"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <h2 className="text-dark text-lg font-bold">Nueva Clase</h2>
            <Button variant="text" color="neutral" onClick={onClose} className="h-auto p-1">
              <X className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
          <form className="space-y-5 p-6">
            <Input
              name="name"
              label="Nombre de la clase"
              placeholder="Ej. Ballet Basico — Grupo A"
            />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Disciplina">
                <option>Ballet</option>
                <option>Salsa</option>
                <option>Yoga</option>
                <option>HIIT</option>
              </Select>
              <Select label="Nivel">
                <option>Basico</option>
                <option>Intermedio</option>
                <option>Avanzado</option>
                <option>Master</option>
              </Select>
            </div>

            {/* Days */}
            <div>
              <label className="text-dark mb-2 block text-sm font-medium">
                Dias de la semana
              </label>
              <div className="flex gap-2">
                {DAYS_ABBR.map((d, i) => (
                  <Button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    variant={selectedDays.includes(i) ? 'contained' : 'text'}
                    color={selectedDays.includes(i) ? 'dark' : 'neutral'}
                    className={cn(
                      'h-9 w-9 rounded-xl p-0',
                      !selectedDays.includes(i) && 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200'
                    )}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="startTime"
                type="time"
                label="Hora inicio"
                defaultValue="09:00"
              />
              <Input
                name="endTime"
                type="time"
                label="Hora fin"
                defaultValue="10:00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="capacity"
                type="number"
                label="Capacidad maxima"
                defaultValue={20}
              />
              <Input
                name="cancelWindow"
                type="number"
                label="Ventana de cancelacion"
                defaultValue={24}
                endAdornment="horas"
              />
            </div>

            <Select name="teacherId" label="Profesor asignado">
              <option value="">Seleccionar profesor</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  Prof. {t.name}
                </option>
              ))}
            </Select>

            <Textarea
              name="description"
              label="Descripcion"
              placeholder="Descripcion breve de la clase..."
              rows={3}
              hint="Opcional"
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="text"
                color="neutral"
                onClick={onClose}
                className="h-11 flex-1 rounded-xl border border-gray-200 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                className="h-11 flex-1 rounded-xl"
              >
                Crear Clase
              </Button>
            </div>
          </form>
      </motion.div>
    </div>
  );
}

export function ClassesClient({
  classes,
  teachers,
  weekStart,
}: ClassesClientProps) {
  const [view, setView] = useState<'week' | 'list'>('week');
  const [modalOpen, setModal] = useState(false);
  const [currentWeek, setWeek] = useState(new Date(weekStart));
  const [listRef] = useAutoAnimate<HTMLTableSectionElement>();
  const [isMobile, setIsMobile] = useState(false);
  const listPagination = usePagination(classes, { pageSize: 10 });

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && view === 'week') setView('list');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [view]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  function prevWeek() {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - 7);
    setWeek(d);
  }
  function nextWeek() {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 7);
    setWeek(d);
  }
  function goToday() {
    setWeek(new Date(weekStart));
  }

  function getClassesForDayHour(dayIndex: number, hour: number) {
    return classes.filter((cls) => {
      const d = new Date(cls.startsAt);
      const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0
      return dayOfWeek === dayIndex && d.getHours() === hour;
    });
  }

  const weekLabel = `${weekDays[0].getDate()} — ${weekDays[6].getDate()} ${new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(weekDays[6])}`;

  const today = new Date();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-dark text-2xl font-bold md:text-3xl">Clases</h1>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-xl border border-gray-200">
            <Button
              onClick={() => { if (!isMobile) setView('week'); }}
              variant={view === 'week' ? 'contained' : 'text'}
              color={view === 'week' ? 'dark' : 'neutral'}
              className={cn(
                'rounded-none px-4 py-2',
                isMobile && 'opacity-40 cursor-not-allowed',
                view !== 'week' && 'border-transparent text-gray-500 hover:bg-gray-50'
              )}
              title={isMobile ? 'Vista de semana disponible en desktop' : undefined}
            >
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Semana
              </span>
            </Button>
            <Button
              onClick={() => setView('list')}
              variant={view === 'list' ? 'contained' : 'text'}
              color={view === 'list' ? 'dark' : 'neutral'}
              className={cn(
                'rounded-none border-l border-gray-200 px-4 py-2',
                view !== 'list' && 'border-transparent text-gray-500 hover:bg-gray-50'
              )}
            >
              <span className="flex items-center gap-1.5">
                <List className="h-4 w-4" /> Lista
              </span>
            </Button>
          </div>
          <Button
            variant="contained"
            onClick={() => setModal(true)}
            className="rounded-xl px-4"
          >
            + Nueva Clase
          </Button>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3">
        <Button
          variant="text"
          color="neutral"
          onClick={prevWeek}
          className="h-auto p-1.5"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </Button>
        <p className="text-dark text-sm font-semibold capitalize">
          {weekLabel}
        </p>
        <Button
          variant="text"
          color="neutral"
          onClick={nextWeek}
          className="h-auto p-1.5"
        >
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </Button>
        <Button
          variant="text"
          color="neutral"
          onClick={goToday}
          className="h-auto px-3 py-1.5 text-xs border border-gray-200 hover:bg-gray-50"
        >
          Hoy
        </Button>
      </div>

      {/* Weekly calendar grid */}
      {view === 'week' && (
        <div className="overflow-auto rounded-2xl border border-gray-50 bg-white shadow-sm">
          <div className="min-w-175">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-gray-50">
              <div className="px-3 py-3" />
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                return (
                  <div
                    key={i}
                    className="border-l border-gray-50 py-3 text-center"
                  >
                    <p className="text-xs font-medium text-gray-400">
                      {DAYS_ES[i]}
                    </p>
                    <div
                      className={cn(
                        'mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
                        isToday ? 'bg-primary text-white' : 'text-dark'
                      )}
                    >
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hour rows */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid min-h-13 grid-cols-8 border-b border-gray-50"
              >
                <div className="self-start px-3 py-2 pt-1 text-right text-xs text-gray-300">
                  {hour}:00
                </div>
                {weekDays.map((_, dayIndex) => {
                  const dayClasses = getClassesForDayHour(dayIndex, hour);
                  return (
                    <div
                      key={dayIndex}
                      className="relative border-l border-gray-50 p-0.5"
                    >
                      {dayClasses.map((cls) => (
                        <div
                          key={cls.id}
                          className={cn(
                            'cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-80',
                            LEVEL_COLORS[cls.skillLevel] ??
                              'border-gray-200 bg-gray-100 text-gray-600'
                          )}
                        >
                          <p className="truncate font-semibold">{cls.name}</p>
                          <p className="text-[10px] opacity-70">
                            {cls._count.attendances}/{cls.maxCapacity}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <TableContainer>
              {classes.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">
                  Sin clases esta semana
                </p>
              ) : (
                <Table>
                  <TableHead>
                    <TableHeader className="pl-5">Clase</TableHeader>
                    <TableHeader>Dia</TableHeader>
                    <TableHeader>Horario</TableHeader>
                    <TableHeader>Nivel</TableHeader>
                    <TableHeader>Asistencia</TableHeader>
                  </TableHead>
                  <TableBody ref={listRef}>
                    {listPagination.paginated.map((cls) => {
                      const start = new Date(cls.startsAt);
                      const end = new Date(cls.endsAt);
                      const dayName = new Intl.DateTimeFormat('es-MX', {
                        weekday: 'long',
                      }).format(start);
                      const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} — ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
                      return (
                        <TableRow key={cls.id}>
                          <TableCell className="text-dark pl-5 font-medium">
                            {cls.name}
                          </TableCell>
                          <TableCell className="text-gray-600 capitalize">
                            {dayName}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-600">
                            {timeStr}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-xs font-medium',
                                LEVEL_COLORS[cls.skillLevel] ??
                                  'border-transparent bg-gray-100 text-gray-600'
                              )}
                            >
                              {cls.skillLevel}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {cls._count.attendances}/{cls.maxCapacity}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <div className="border-t border-gray-50">
                <Pagination
                  page={listPagination.page}
                  totalPages={listPagination.totalPages}
                  total={listPagination.total}
                  pageSize={listPagination.pageSize}
                  hasNext={listPagination.hasNext}
                  hasPrev={listPagination.hasPrev}
                  onNext={listPagination.next}
                  onPrev={listPagination.prev}
                  onGoTo={listPagination.goTo}
                  label="clases"
                />
              </div>
            </TableContainer>
          </div>

          {/* Mobile cards grouped by day */}
          <div className="space-y-4 md:hidden">
            {classes.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">
                Sin clases esta semana
              </p>
            ) : (
              (() => {
                const grouped = listPagination.paginated.reduce<Record<string, typeof classes>>((acc, cls) => {
                  const d = new Date(cls.startsAt);
                  const key = d.toDateString();
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(cls);
                  return acc;
                }, {});
                const todayStr = new Date().toDateString();
                return Object.entries(grouped).map(([dateStr, dayClasses]) => {
                  const d = new Date(dateStr);
                  const isToday = dateStr === todayStr;
                  const label = `${isToday ? 'HOY — ' : ''}${new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }).format(d)}`;
                  return (
                    <div key={dateStr}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                        {label}
                      </p>
                      <div className="space-y-2">
                        {dayClasses.map((cls) => {
                          const start = new Date(cls.startsAt);
                          const end = new Date(cls.endsAt);
                          const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} — ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
                          const levelColor = LEVEL_COLORS[cls.skillLevel];
                          const borderColor = levelColor?.includes('success') ? 'border-l-green-500'
                            : levelColor?.includes('primary') ? 'border-l-blue-500'
                            : levelColor?.includes('warning') ? 'border-l-amber-500'
                            : 'border-l-gray-400';
                          return (
                            <div
                              key={cls.id}
                              className={cn('rounded-xl border-l-4 bg-white p-4 shadow-sm', borderColor)}
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500">
                                  {timeStr}
                                </span>
                                <span className="text-dark text-sm font-bold">{cls.name}</span>
                              </div>
                              <p className="mb-2 text-xs text-gray-400">
                                Cupos: {cls._count.attendances}/{cls.maxCapacity}
                              </p>
                              <Button
                                variant="text"
                                color="primary"
                                className="h-auto w-full justify-center rounded-lg border border-gray-100 py-2 text-xs font-semibold"
                              >
                                Ver inscritos
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()
            )}
            {/* Mobile Pagination */}
            <div className="mt-4 rounded-xl bg-white shadow-sm">
              <Pagination
                page={listPagination.page}
                totalPages={listPagination.totalPages}
                total={listPagination.total}
                pageSize={listPagination.pageSize}
                hasNext={listPagination.hasNext}
                hasPrev={listPagination.hasPrev}
                onNext={listPagination.next}
                onPrev={listPagination.prev}
                onGoTo={listPagination.goTo}
                label="clases"
              />
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {modalOpen && (
          <NewClassModal
            key="new-class-modal"
            teachers={teachers}
            onClose={() => setModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
