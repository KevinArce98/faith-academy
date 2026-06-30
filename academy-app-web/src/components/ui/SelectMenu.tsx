import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';

export type SelectOption = { value: string; label: string };

type SelectMenuProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
};

type Coords = { top: number; left: number; width: number };

// Select custom (no nativo). La lista se renderiza con portal en document.body
// con position fixed, así NO la recorta ningún contenedor con overflow (modales,
// tablas). Cierra al hacer clic afuera, con Escape, o al hacer scroll.
export function SelectMenu({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  className,
  buttonClassName,
  disabled,
}: SelectMenuProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const open = coords !== null;
  const selected = options.find((o) => o.value === value);

  function place() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  function toggle() {
    if (open) setCoords(null);
    else place();
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !listRef.current?.contains(t)) {
        setCoords(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCoords(null);
    }
    // Si la página/modal hace scroll, la lista quedaría desalineada → cerrar.
    // Pero si el scroll ocurre dentro del propio listado, dejarlo pasar.
    function onScrollOrResize(e: Event) {
      if (listRef.current?.contains(e.target as Node)) return;
      setCoords(null);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <span className="text-label text-dark">{label}</span>}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'text-dark flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-4 text-left text-sm outline-none transition-colors',
          'focus:border-primary focus:ring-primary/20 focus:ring-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          open && 'border-primary ring-primary/20 ring-2',
          buttonClassName
        )}
      >
        <span className={cn('truncate', !selected && 'text-gray-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {coords &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
            className="z-[100] max-h-64 overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
          >
            {options.length === 0 ? (
              <li className="px-4 py-2 text-sm text-gray-400">Sin opciones</li>
            ) : (
              options.map((opt) => {
                const active = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setCoords(null);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition-colors',
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-dark hover:bg-gray-50'
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body
        )}
    </div>
  );
}
