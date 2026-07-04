export type Plan = { id: string; name: string; price: number };

export type Student = { id: string; name: string; email: string };

export type Order = {
  id: string;
  kind: 'PLAN' | 'ENROLLMENT';
  status: string;
  createdAt: Date | string;
  approvedAt: Date | string | null;
  receiptUrl: string | null;
  creditGranted: number | null;
  expiresAt: Date | string | null;
  bookingDate: string | null;
  bookingClass?: { name: string } | null;
  student?: Student;
  plan: Plan;
};

export type TabKey = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'ALL';

// Estado de matrícula (pago anual, no confundir con EnrollData de clases mensuales).
export type EnrollmentStatus = {
  fee: number | null;
  active: boolean;
  pending: boolean;
  expiresAt: string | null;
};
