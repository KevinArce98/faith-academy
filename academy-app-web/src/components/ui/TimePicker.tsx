import { Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';

type Coords = { top: number; left: number };

type TimePickerProps = {
  /** Valor en formato "HH:mm" (24h) */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Paso de los minutos en la lista (por defecto 5) */
  minuteStep?: number;
  className?: string;
};

type Period = 'AM' | 'PM';

function parse(value: string): { h24: number; m: number } | null {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  if (h > 23 || m > 59) return null;
  return { h24: h, m };
}

function to12(h24: number): { h12: number; period: Period } {
  const period: Period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h12, period };
}

function to24(h12: number, period: Period): number {
  if (period === 'AM') return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDisplay(value: string): string {
  const p = parse(value);
  if (!p) return 'Seleccionar hora';
  const { h12, period } = to12(p.h24);
  return `${pad(h12)}:${pad(p.m)} ${period}`;
}

export function TimePicker({ value, onChange, label, minuteStep = 5, className }: TimePickerProps) {
  const parsed = parse(value);
  const base = parsed ?? { h24: 12, m: 0 };
  const { h12, period } = to12(base.h24);

  const [coords, setCoords] = useState<Coords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const open = coords !== null;

  const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
  const minutes: number[] = [];
  for (let m = 0; m < 60; m += minuteStep) minutes.push(m);
  if (!minutes.includes(base.m)) {
    minutes.push(base.m);
    minutes.sort((a, b) => a - b);
  }

  function place() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 4, left: r.left });
  }

  function toggle() {
    if (open) setCoords(null);
    else place();
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !popRef.current?.contains(t)) {
        setCoords(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCoords(null);
    }
    function onScroll(e: Event) {
      if (popRef.current?.contains(e.target as Node)) return;
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

  function emit(nextH12: number, nextM: number, nextPeriod: Period) {
    const h24 = to24(nextH12, nextPeriod);
    onChange(`${pad(h24)}:${pad(nextM)}`);
  }

  const colCls = 'flex max-h-52 flex-col overflow-y-auto py-1 [scrollbar-width:thin]';

  function optionCls(active: boolean) {
    return cn(
      'mx-1 shrink-0 rounded-lg px-3 py-2 text-center text-sm transition-colors',
      active ? 'bg-primary font-semibold text-white' : 'text-dark hover:bg-gray-100'
    );
  }

  // Lleva la opción seleccionada al centro al abrir.
  const activeRef = (active: boolean) => (el: HTMLButtonElement | null) => {
    if (active && el) el.scrollIntoView({ block: 'center' });
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
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
          !parsed && 'text-gray-400'
        )}
      >
        {formatDisplay(value)}
        <Clock className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {coords &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            style={{ position: 'fixed', top: coords.top, left: coords.left }}
            className="z-[100] flex w-44 rounded-2xl border border-gray-100 bg-white p-1 shadow-xl"
          >
            <div className={colCls}>
              {hours.map((h) => {
                const active = h === h12;
                return (
                  <button
                    key={h}
                    ref={activeRef(active)}
                    type="button"
                    onClick={() => emit(h, base.m, period)}
                    className={optionCls(active)}
                  >
                    {pad(h)}
                  </button>
                );
              })}
            </div>
            <div className={colCls}>
              {minutes.map((m) => {
                const active = m === base.m;
                return (
                  <button
                    key={m}
                    ref={activeRef(active)}
                    type="button"
                    onClick={() => emit(h12, m, period)}
                    className={optionCls(active)}
                  >
                    {pad(m)}
                  </button>
                );
              })}
            </div>
            <div className={colCls}>
              {(['AM', 'PM'] as Period[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => emit(h12, base.m, p)}
                  className={optionCls(p === period)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
