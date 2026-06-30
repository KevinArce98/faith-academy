// Lógica PURA del reparto de pago a profesores (sin DB) — testeable con fixtures.

const round2 = (n: number) => Math.round(n * 100) / 100;

export type StudentContribution = {
	studentId: string;
	studentName: string;
	planName: string;
	amount: number;
};

export type ClassLine = {
	classId: string;
	className: string;
	amount: number;
	students: number;
	studentList: StudentContribution[];
};

export type TeacherPayout = {
	teacherId: string;
	teacherName: string;
	total: number;       // ingresos: porción de mensualidades que corresponde a este profe
	hoursWorked: number; // horas dadas según sesiones registradas
	cost: number;        // hoursWorked × hourlyRate (0 si sin tarifa)
	net: number;         // total − cost
	classes: ClassLine[];
};

export type ClassStat = {
	classId: string;
	className: string;
	teacherId: string;
	teacherName: string;
	students: number;
	revenue: number;
};

export type PayoutResult = {
	totals: {
		collected: number;
		pending: number;
		allocated: number;
		unallocated: number;
	};
	payouts: TeacherPayout[];
	classStats: ClassStat[];
};

export type PayoutInput = {
	subscriptions: {
		studentId: string;
		amount: number;
		isPaid: boolean;
		studentName?: string;
		planName?: string;
	}[];
	attendance: { studentId: string; classId: string }[];
	classes: { id: string; name: string; teacherId: string }[];
	teachers: { id: string; name: string | null; hourlyRate?: number | null }[];
	// Sesiones realmente dadas en el mes: count = fechas distintas, durationMinutes = duración promedio del slot
	sessions?: { classId: string; durationMinutes: number; count: number }[];
};

// Reparte cada mensualidad PAGADA del mes entre las clases distintas que el
// alumno se inscribió (partes iguales) y agrega por clase y por profesor.
// Además calcula horas trabajadas, costo y neto por profesor.
export function reducePayouts(input: PayoutInput): PayoutResult {
	const {
		subscriptions,
		attendance,
		classes,
		teachers,
		sessions = [],
	} = input;

	const classById = new Map(classes.map((cl) => [cl.id, cl]));
	const teacherName = new Map(teachers.map((t) => [t.id, t.name ?? '']));
	const teacherHourlyRate = new Map(
		teachers.map((t) => [t.id, t.hourlyRate ?? null]),
	);

	// Minutos trabajados por profesor según sesiones dadas × duración
	const teacherMinutes = new Map<string, number>();
	for (const sess of sessions) {
		const cls = classById.get(sess.classId);
		if (!cls) continue;
		teacherMinutes.set(
			cls.teacherId,
			(teacherMinutes.get(cls.teacherId) ?? 0) + sess.count * sess.durationMinutes,
		);
	}

	// Clases distintas en que se inscribió cada alumno este mes
	const classesByStudent = new Map<string, Set<string>>();
	for (const a of attendance) {
		let set = classesByStudent.get(a.studentId);
		if (!set) {
			set = new Set<string>();
			classesByStudent.set(a.studentId, set);
		}
		set.add(a.classId);
	}

	const classAmount = new Map<string, number>();
	const classStudents = new Map<string, number>();
	const classStudentList = new Map<string, StudentContribution[]>();

	let collected = 0;
	let pending = 0;
	let unallocated = 0;

	for (const sub of subscriptions) {
		const amount = Number(sub.amount);
		if (!sub.isPaid) {
			pending += amount;
			continue;
		}
		collected += amount;

		const attended = classesByStudent.get(sub.studentId);
		const n = attended?.size ?? 0;
		if (n === 0) {
			unallocated += amount;
			continue;
		}

		const share = amount / n;
		for (const classId of attended!) {
			classAmount.set(classId, (classAmount.get(classId) ?? 0) + share);
			classStudents.set(classId, (classStudents.get(classId) ?? 0) + 1);
			const list = classStudentList.get(classId) ?? [];
			list.push({
				studentId: sub.studentId,
				studentName: sub.studentName ?? sub.studentId,
				planName: sub.planName ?? '',
				amount: round2(share),
			});
			classStudentList.set(classId, list);
		}
	}

	const byTeacher = new Map<string, TeacherPayout>();
	const classStats: ClassStat[] = [];

	for (const [classId, amount] of classAmount) {
		const cls = classById.get(classId);
		if (!cls) continue;
		const tName = teacherName.get(cls.teacherId) ?? 'Sin profesor';
		const students = classStudents.get(classId) ?? 0;

		classStats.push({
			classId,
			className: cls.name,
			teacherId: cls.teacherId,
			teacherName: tName,
			students,
			revenue: round2(amount),
		});

		if (!byTeacher.has(cls.teacherId)) {
			byTeacher.set(cls.teacherId, {
				teacherId: cls.teacherId,
				teacherName: tName,
				total: 0,
				hoursWorked: 0,
				cost: 0,
				net: 0,
				classes: [],
			});
		}
		const entry = byTeacher.get(cls.teacherId)!;
		entry.total += amount;
		entry.classes.push({
			classId,
			className: cls.name,
			amount: round2(amount),
			students,
			studentList: classStudentList.get(classId) ?? [],
		});
	}

	// Agregar profes que dieron sesiones pero no tienen alumnos pagados inscritos
	for (const teacher of teachers) {
		if (byTeacher.has(teacher.id)) continue;
		const mins = teacherMinutes.get(teacher.id) ?? 0;
		if (mins === 0) continue;
		byTeacher.set(teacher.id, {
			teacherId: teacher.id,
			teacherName: teacher.name ?? 'Sin nombre',
			total: 0,
			hoursWorked: 0,
			cost: 0,
			net: 0,
			classes: [],
		});
	}

	const payouts = [...byTeacher.values()]
		.map((t) => {
			const mins = teacherMinutes.get(t.teacherId) ?? 0;
			const hoursWorked = round2(mins / 60);
			const rate = teacherHourlyRate.get(t.teacherId) ?? null;
			const cost = rate != null ? round2(hoursWorked * rate) : 0;
			const total = round2(t.total);
			return {
				...t,
				total,
				hoursWorked,
				cost,
				net: round2(total - cost),
				classes: t.classes.sort((a, b) => b.amount - a.amount),
			};
		})
		.sort((a, b) => b.total - a.total);

	classStats.sort((a, b) => b.revenue - a.revenue);

	return {
		totals: {
			collected: round2(collected),
			pending: round2(pending),
			allocated: round2(collected - unallocated),
			unallocated: round2(unallocated),
		},
		payouts,
		classStats,
	};
}
