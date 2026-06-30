// Formatea los slots de horario de una clase a texto legible.
// Ej: [{1, "17:00","18:00"},{3,"18:00","19:00"}] → "Lun 5:00pm–6:00pm · Mié 6:00pm–7:00pm"

const DAYS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']; // 1=Lun..7=Dom

function to12h(t: string): string {
	const [hStr, m] = t.split(':');
	let h = Number(hStr);
	const suffix = h >= 12 ? 'pm' : 'am';
	h = h % 12 || 12;
	return `${h}:${m}${suffix}`;
}

export type Slot = { dayOfWeek: number; startTime: string; endTime: string };

export function formatSlots(slots: Slot[] | undefined | null): string {
	if (!slots || slots.length === 0) return '';
	return slots
		.map(
			(s) =>
				`${DAYS[s.dayOfWeek] ?? ''} ${to12h(s.startTime)}–${to12h(s.endTime)}`,
		)
		.join(' · ');
}

const MONTHS = [
	'ene',
	'feb',
	'mar',
	'abr',
	'may',
	'jun',
	'jul',
	'ago',
	'sep',
	'oct',
	'nov',
	'dic',
];

// Horario de una clase ÚNICA: "vie 17 jul · 5:00pm–6:00pm".
export function formatOneOff(
	date: Date,
	slots: Slot[] | undefined | null,
): string {
	const dow = ((date.getUTCDay() + 6) % 7) + 1; // 1=Lun..7=Dom
	const label = `${DAYS[dow]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
	const slot = slots?.[0];
	return slot ? `${label} · ${to12h(slot.startTime)}–${to12h(slot.endTime)}` : label;
}
