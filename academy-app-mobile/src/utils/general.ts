import { theme } from '@/theme';

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(theme.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatMonthYear(value: string | Date): string {
  const d = new Date(value);
  const label = new Date(d.getUTCFullYear(), d.getUTCMonth(), 1).toLocaleDateString(theme.locale, {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatPrice(price: number | string): string {
  return new Intl.NumberFormat(theme.locale, {
    style: 'currency',
    currency: theme.currency,
    minimumFractionDigits: 0,
  }).format(Number(price));
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return '';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (mins <= 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} minutos`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
  return `Hace ${Math.floor(hrs / 24)} días`;
}

export function formatShortDate(iso: string | Date | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(theme.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formatea una fecha "solo día" (YYYY-MM-DD o ISO en UTC) sin desfase de zona
 * horaria. El backend guarda bookingDate como medianoche UTC; interpretarla con
 * `new Date` la correría un día en zonas con offset negativo (ej. Costa Rica).
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString(theme.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function currentMonth(): string {
  const now = new Date();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${m}`;
}

/** Desplaza un período "YYYY-MM" en `delta` meses (negativo = atrás). */
export function shiftMonth(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** JS getDay (0=Dom..6=Sáb) → convención schema (1=Lun..7=Dom) */
export function todayDow(): number {
  return ((new Date().getDay() + 6) % 7) + 1;
}

export function dayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const js = new Date(y, m - 1, d).getDay();
  return js === 0 ? 7 : js;
}
