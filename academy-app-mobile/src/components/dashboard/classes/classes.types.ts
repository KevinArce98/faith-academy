import type { SelectOption } from '@/components/ui/Select';

export type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export const DAY_OPTIONS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
] as const;

export const LEVEL_OPTIONS: SelectOption[] = [
  { value: 'BEGINNER', label: 'Básico' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
  { value: 'MASTER', label: 'Máster' },
];

/** Half-hour time options 06:00–22:00 as "HH:MM" for slot pickers. */
export const TIME_OPTIONS: SelectOption[] = (() => {
  const opts: SelectOption[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const suffix = h >= 12 ? 'pm' : 'am';
      const h12 = h % 12 || 12;
      opts.push({ value, label: `${h12}:${String(m).padStart(2, '0')} ${suffix}` });
    }
  }
  return opts;
})();

/** ISO weekday (1=Mon … 7=Sun) from a "YYYY-MM-DD" string. */
export function dowFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const js = new Date(y, m - 1, d).getDay();
  return ((js + 6) % 7) + 1;
}
