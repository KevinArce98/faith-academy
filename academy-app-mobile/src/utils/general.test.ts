import { describe, expect, it } from 'vitest';

import {
  dayOfWeekFromDate,
  formatDateOnly,
  formatMonthYear,
  formatPrice,
  getInitials,
  timeAgo,
  todayDow,
} from './general';

describe('getInitials', () => {
  it('toma las iniciales de hasta dos palabras', () => {
    expect(getInitials('Kevin Arias')).toBe('KA');
    expect(getInitials('ana maria lopez')).toBe('AM');
    expect(getInitials('Solo')).toBe('S');
  });
});

describe('dayOfWeekFromDate (1=Lun … 7=Dom)', () => {
  it('mapea correctamente días conocidos', () => {
    expect(dayOfWeekFromDate('2024-01-01')).toBe(1); // lunes
    expect(dayOfWeekFromDate('2024-01-07')).toBe(7); // domingo
  });
});

describe('todayDow', () => {
  it('está en el rango 1..7', () => {
    const d = todayDow();
    expect(d).toBeGreaterThanOrEqual(1);
    expect(d).toBeLessThanOrEqual(7);
  });
});

describe('formatDateOnly (sin desfase de zona horaria)', () => {
  it('una fecha UTC a medianoche no se corre al día anterior', () => {
    // Bug clásico: new Date('2026-07-01T00:00:00Z') en CR (UTC-6) daría 30 jun.
    const out = formatDateOnly('2026-07-01T00:00:00.000Z');
    expect(out).toContain('2026');
    expect(out.toLowerCase()).toContain('julio');
    expect(out.toLowerCase()).not.toContain('junio');
  });

  it('vacío/nulo → cadena vacía', () => {
    expect(formatDateOnly(null)).toBe('');
    expect(formatDateOnly(undefined)).toBe('');
  });
});

describe('formatMonthYear', () => {
  it('capitaliza y usa mes + año', () => {
    const out = formatMonthYear('2026-07');
    expect(out).toMatch(/^[A-ZÁÉÍÓÚÑ]/); // primera letra mayúscula
    expect(out).toContain('2026');
  });
});

describe('formatPrice', () => {
  it('formatea el monto sin decimales', () => {
    const out = formatPrice(8000);
    expect(out).toContain('8');
    expect(out).not.toContain('.00');
  });
});

describe('timeAgo', () => {
  it('devuelve buckets relativos', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(new Date())).toBe('Hace un momento');
    expect(timeAgo(new Date(Date.now() - 5 * 60_000))).toBe('Hace 5 minutos');
    expect(timeAgo(new Date(Date.now() - 3 * 3_600_000))).toBe('Hace 3 horas');
    expect(timeAgo(new Date(Date.now() - 2 * 86_400_000))).toBe('Hace 2 días');
  });
});
