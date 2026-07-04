export type PaymentPlan = { id: string; name: string; price: number };
export type PaymentStudent = { id: string; name: string; email: string };

export type Order = {
  id: string;
  kind: 'PLAN' | 'ENROLLMENT';
  status: 'PENDING_REVIEW' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';
  createdAt: string;
  approvedAt: string | null;
  receiptUrl: string | null;
  expiresAt: string | null;
  notes: string | null;
  bookingDate: string | null;
  bookingClass?: { name: string } | null;
  student?: PaymentStudent;
  plan: PaymentPlan;
};

// Estado de matrícula (pago anual, no confundir con EnrollData de clases mensuales).
export type EnrollmentStatus = {
  fee: number | null;
  active: boolean;
  pending: boolean;
  expiresAt: string | null;
};

export const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
  PENDING_REVIEW: 'Pendiente',
  ACTIVE: 'Aprobado',
  EXPIRED: 'Vencido',
  REJECTED: 'Rechazado',
};

export const ORDER_STATUS_COLOR: Record<Order['status'], string> = {
  PENDING_REVIEW: 'text-warning',
  ACTIVE: 'text-success',
  EXPIRED: 'text-gray-400',
  REJECTED: 'text-danger',
};
