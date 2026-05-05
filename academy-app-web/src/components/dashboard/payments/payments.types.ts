export type Plan = { id: string; name: string; price: number };

export type Student = { id: string; name: string; email: string };

export type Order = {
	id: string;
	status: string;
	createdAt: Date | string;
	approvedAt: Date | string | null;
	receiptUrl: string | null;
	creditGranted: number | null;
	expiresAt: Date | string | null;
	student?: Student;
	plan: Plan;
};

export type TabKey = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'ALL';
