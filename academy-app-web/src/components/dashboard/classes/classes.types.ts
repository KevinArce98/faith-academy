export type ClsCount = { attendances: number };

export type Cls = {
	id: string;
	name: string;
	startsAt: string;
	endsAt: string;
	maxCapacity: number;
	skillLevel: string;
	teacherId: string;
	description?: string | null;
	cancelWindowHours?: number;
	_count: ClsCount;
	isEnrolled?: boolean;
};

export type Teacher = { id: string; name: string | null };

export type ClassesClientProps = {
	classes: Cls[];
	teachers: Teacher[];
	weekStart: string;
	role: 'ADMIN' | 'TEACHER' | 'STUDENT';
	userId: string;
};
