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
