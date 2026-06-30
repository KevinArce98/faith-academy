import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
// Lunes primero
const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type Coords = { top: number; left: number; width: number };

type DatePickerProps = {
  /** Valor en formato "YYYY-MM-DD" */
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

function fromString(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(s: string): string {
  const d = fromString(s);
  if (!d) return 'Seleccionar fecha';
  return d.toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Retorna 42 fechas (6 semanas × 7 días), lunes primero.
function calendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // (0=Dom → 6, 1=Lun → 0 … 6=Sáb → 5)
  const startDow = (first.getDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = startDow; i > 0; i--) {
    days.push(new Date(year, month, 1 - i));
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  let next = 1;
  while (days.length < 42) {
    days.push(new Date(year, month + 1, next++));
  }
  return days;
}

export function DatePicker({ value, onChange, label }: DatePickerProps) {
  const selected = fromString(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const [coords, setCoords] = useState<Coords | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const open = coords !== null;

  function place() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  function toggle() {
    if (open) setCoords(null);
    else {
      // Sincronizar vista al valor actual
      if (selected) {
        setViewYear(selected.getFullYear());
        setViewMonth(selected.getMonth());
      }
      place();
    }
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !calRef.current?.contains(t)) {
        setCoords(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCoords(null);
    }
    function onScroll(e: Event) {
      if (calRef.current?.contains(e.target as Node)) return;
      setCoords(null);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', () => setCoords(null));
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }

  function selectDay(d: Date) {
    onChange(toString(d));
    setCoords(null);
  }

  const days = calendarDays(viewYear, viewMonth);

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-label text-dark">{label}</span>}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'text-dark flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-4 text-left text-sm outline-none transition-colors',
          'focus:border-primary focus:ring-primary/20 focus:ring-2',
          open && 'border-primary ring-primary/20 ring-2',
          !value && 'text-gray-400'
        )}
      >
        {formatDisplay(value)}
        <ChevronLeft
          className={cn(
            'h-4 w-4 shrink-0 rotate-[-90deg] text-gray-400 transition-transform',
            open && 'rotate-90'
          )}
        />
      </button>

      {coords &&
        createPortal(
          <div
            ref={calRef}
            role="dialog"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: Math.max(coords.width, 280),
            }}
            className="z-[100] rounded-2xl border border-gray-100 bg-white p-4 shadow-xl"
          >
            {/* Header: mes y año + navegación */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="hover:bg-gray-100 rounded-lg p-1 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
              <span className="text-dark text-sm font-semibold">
                {MONTHS_ES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="hover:bg-gray-100 rounded-lg p-1 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="mb-1 grid grid-cols-7 text-center">
              {DAYS_ES.map((d) => (
                <span key={d} className="text-[11px] font-semibold text-gray-400">
                  {d}
                </span>
              ))}
            </div>

            {/* Grilla de días */}
            <div className="grid grid-cols-7">
              {days.map((d, i) => {
                const isCurrentMonth = d.getMonth() === viewMonth;
                const isToday = d.getTime() === today.getTime();
                const isSelected =
                  selected &&
                  d.getFullYear() === selected.getFullYear() &&
                  d.getMonth() === selected.getMonth() &&
                  d.getDate() === selected.getDate();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDay(d)}
                    className={cn(
                      'flex h-8 w-full items-center justify-center rounded-lg text-sm transition-colors',
                      !isCurrentMonth && 'text-gray-300',
                      isCurrentMonth && !isSelected && !isToday && 'text-dark hover:bg-gray-100',
                      isToday && !isSelected && 'text-primary font-semibold hover:bg-primary/10',
                      isSelected && 'bg-primary text-white font-semibold hover:bg-primary/90'
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 flex justify-between border-t border-gray-50 pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setCoords(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => selectDay(today)}
                className="text-primary text-xs font-semibold hover:underline"
              >
                Hoy
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
