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
  return new Intl.DateTimeFormat('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatPrice(price: number | string): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
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
  return new Date(iso).toLocaleDateString('es-CR', {
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
