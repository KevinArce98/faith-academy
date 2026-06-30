export type Plan = { id: string; name: string };

export type Subscription = {
	id: string;
	planId: string;
	period: string;
	amount: number;
	isPaid: boolean;
	paidAt: string | null;
	expiresAt: string | null;
	plan: { id: string; name: string; isPublic?: boolean };
};

export function isSubscriptionActive(sub: Subscription | null): boolean {
	if (!sub || !sub.isPaid || !sub.expiresAt) return false;
	return new Date(sub.expiresAt).getTime() > Date.now();
}

export function isSubscriptionExpired(sub: Subscription | null): boolean {
	if (!sub || !sub.isPaid || !sub.expiresAt) return false;
	return new Date(sub.expiresAt).getTime() <= Date.now();
}

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

export function currentSubscription(student: Student): Subscription | null {
	return student.subscriptions[0] ?? null;
}
