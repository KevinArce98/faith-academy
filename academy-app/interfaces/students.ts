export type Plan = { id: string; name: string };
export type Order = {
  id: string;
  status: string;
  expiresAt: Date | null;
  creditGranted: number | null;
  notes?: string | null;
  plan: Plan;
};
export type FamilyMember = { family: { name: string }; position: number };
export type Student = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: Date;
  orders: Order[];
  familyMember: FamilyMember | null;
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'ACTIVO',
  EXPIRED: 'VENCIDO',
  PENDING_REVIEW: 'EN REVISION',
  REJECTED: 'RECHAZADO',
  CANCELLED: 'CANCELADO',
};
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  EXPIRED: 'bg-danger/10 text-danger',
  PENDING_REVIEW: 'bg-warning/10 text-warning',
  REJECTED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-gray-100 text-gray-500',
};