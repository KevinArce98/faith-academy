export type Slot = { dayOfWeek: number; startTime: string; endTime: string };

const DAYS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const FULL_DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function to12h(t: string): string {
  const [hStr, m] = t.split(':');
  let h = Number(hStr);
  const suffix = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m}${suffix}`;
}

export function formatSlotRange(start: string, end: string): string {
  return `${to12h(start)}–${to12h(end)}`;
}

export function dayLabel(dayOfWeek: number): string {
  return DAYS[dayOfWeek] ?? '';
}

export function fullDayLabel(dayOfWeek: number): string {
  return FULL_DAYS[dayOfWeek] ?? '';
}
