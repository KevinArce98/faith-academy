// Formato de hora de la app (igual que el backend `formatSlots`): "5:00pm".
// Usar SIEMPRE este formato para horarios de clases en todo el front.

const DAYS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']; // 1=Lun..7=Dom

export type Slot = { dayOfWeek: number; startTime: string; endTime: string };

// "17:00" → "5:00pm"
export function to12h(t: string): string {
	const [hStr, m] = t.split(':');
	let h = Number(hStr);
	const suffix = h >= 12 ? 'pm' : 'am';
	h = h % 12 || 12;
	return `${h}:${m}${suffix}`;
}

// "17:00","18:00" → "5:00pm–6:00pm"
export function formatSlotRange(start: string, end: string): string {
	return `${to12h(start)}–${to12h(end)}`;
}

// 1 → "Lun"
export function dayLabel(dayOfWeek: number): string {
	return DAYS[dayOfWeek] ?? '';
}
