import { theme } from '@/theme';
import { to12h } from '@/utils/schedule';

export type Slot = { dayOfWeek: number; startTime: string; endTime: string };

export type ClassOption = {
  id: string;
  name: string;
  skillLevel: string;
  slots: Slot[];
  isPrivate?: boolean;
  oneOffDate?: string | null;
};

function prettyDate(d: Date): string {
  return d.toLocaleDateString(theme.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Próximas fechas en que se imparte la clase, como opciones para reservar. */
export function upcomingSessions(
  cls: ClassOption,
  weeks = 6,
): { date: string; label: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (cls.oneOffDate) {
    const [y, m, d] = cls.oneOffDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt < today) return [];
    const slot = cls.slots[0];
    const time = slot ? ` · ${to12h(slot.startTime)}` : '';
    return [{ date: cls.oneOffDate, label: `${prettyDate(dt)}${time}` }];
  }

  const out: { date: string; label: string }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = ((d.getDay() + 6) % 7) + 1; // 1=Lun … 7=Dom
    const slot = cls.slots.find((s) => s.dayOfWeek === dow);
    if (!slot) continue;
    out.push({ date: ymd(d), label: `${prettyDate(d)} · ${to12h(slot.startTime)}` });
  }
  return out;
}
