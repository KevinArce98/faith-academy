export function addMonths(date: Date, months: number): Date {
	const result = new Date(date);
	result.setMonth(result.getMonth() + months);
	return result;
}

export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

export function addYears(date: Date, years: number): Date {
	const result = new Date(date);
	result.setFullYear(result.getFullYear() + years);
	return result;
}

export function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Primer día del mes en UTC. Se usa como `period` canónico (mensualidad /
// asistencia mensual) para que el unique [studentId, period] no sufra drift
// por zona horaria.
export function monthPeriod(date: Date = new Date()): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// Acepta "YYYY-MM" o "YYYY-MM-DD" (o Date) y lo normaliza al período mensual UTC.
export function parseMonthPeriod(input?: string | Date | null): Date {
	if (!input) return monthPeriod();
	if (input instanceof Date) return monthPeriod(input);
	const match = /^(\d{4})-(\d{2})/.exec(input);
	if (match) {
		return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
	}
	const parsed = new Date(input);
	return Number.isNaN(parsed.getTime()) ? monthPeriod() : monthPeriod(parsed);
}

export function startOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result;
}

export function endOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(23, 59, 59, 999);
	return result;
}
