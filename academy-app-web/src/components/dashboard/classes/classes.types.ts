export type ClsCount = { attendances: number };

// Un slot del horario: día (1=Lun..7=Dom) + hora inicio/fin "HH:mm".
export type Slot = {
	dayOfWeek: number;
	startTime: string;
	endTime: string;
};

export type Cls = {
	id: string;
	name: string;
	schedule?: string; // texto ya formateado por el API (para mostrar)
	slots?: Slot[]; // crudo (para el editor)
	skillLevel: string;
	teacherId: string;
	description?: string | null;
	maxCapacity?: number;
	isPrivate?: boolean;
	oneOffDate?: string | null; // "YYYY-MM-DD" si es clase única; null = recurrente
	_count?: ClsCount;
};

export const DAY_OPTIONS = [
	{ value: 1, label: 'Lunes' },
	{ value: 2, label: 'Martes' },
	{ value: 3, label: 'Miércoles' },
	{ value: 4, label: 'Jueves' },
	{ value: 5, label: 'Viernes' },
	{ value: 6, label: 'Sábado' },
	{ value: 7, label: 'Domingo' },
] as const;

export type Teacher = { id: string; name: string | null };

// "YYYY-MM-DD" → día de la semana del schema (1=Lun … 7=Dom).
export function dowFromDate(dateStr: string): number {
	const [y, m, d] = dateStr.split('-').map(Number);
	const js = new Date(y, m - 1, d).getDay(); // 0=Dom … 6=Sáb
	return ((js + 6) % 7) + 1;
}

export type ClassesClientProps = {
	classes: Cls[];
	teachers: Teacher[];
	role: 'ADMIN' | 'TEACHER' | 'STUDENT';
	userId: string;
};

export const LEVEL_OPTIONS = [
	{ value: 'BEGINNER', label: 'Básico' },
	{ value: 'INTERMEDIATE', label: 'Intermedio' },
	{ value: 'ADVANCED', label: 'Avanzado' },
	{ value: 'MASTER', label: 'Máster' },
] as const;

export const LEVEL_LABELS: Record<string, string> = {
	BEGINNER: 'Básico',
	INTERMEDIATE: 'Intermedio',
	ADVANCED: 'Avanzado',
	MASTER: 'Máster',
};

export const LEVEL_COLORS: Record<string, string> = {
	BEGINNER: 'bg-success/15 text-success',
	INTERMEDIATE: 'bg-primary/15 text-primary',
	ADVANCED: 'bg-warning/15 text-warning',
	MASTER: 'bg-dark/15 text-dark',
};
