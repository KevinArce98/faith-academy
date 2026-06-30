export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos dias';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function timeAgo(date: Date | string | null | undefined) {
  if (!date) return '';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));

  if (mins <= 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} minutos`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
  return `Hace ${Math.floor(hrs / 24)} días`;
}

export function formatPrice(price: number | string) {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
  }).format(Number(price));
}
