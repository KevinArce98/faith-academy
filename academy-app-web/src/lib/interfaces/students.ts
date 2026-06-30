export type Plan = { id: string; name: string };

// Mensualidad de un mes concreto (modelo flat-fee).
export type Subscription = {
	id: string;
	planId: string;
	period: string;
	amount: number;
	isPaid: boolean;
	paidAt: string | null;
	plan: { id: string; name: string; isPublic?: boolean };
};

export type Student = {
	id: string;
	name: string;
	email: string;
	phone?: string;
	role: string;
	createdAt: string;
	isActive: boolean;
	enrollmentFee: number | null;
	enrolledAt: string | null;
	subscriptions: Subscription[];
};

// La mensualidad vigente del alumno = la suscripción más reciente.
export function currentSubscription(student: Student): Subscription | null {
	return student.subscriptions[0] ?? null;
}
