export type TeacherClass = {
	id: string;
	name: string;
	dayOfWeek: string;
	startTime: string;
	endTime: string;
	capacity: number;
	attendanceCount: number;
};

export type TeacherProfile = {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
	role: 'TEACHER';
	isActive: boolean;
	createdAt: string;
	classes: TeacherClass[];
};
