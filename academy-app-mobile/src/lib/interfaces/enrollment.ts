/** Estado de inscripción del alumno (GET /monthly-attendance/me). */
export type EnrollData = {
  enrolledClassIds: string[];
  active: boolean;
  allowance: number | null;
  needsRenewal: boolean;
  singleClass: boolean;
  expiresAt: string | null;
};

/** Suscripción con alumno embebido (GET /subscriptions?period=). */
export type SubscriptionWithStudent = {
  studentId: string;
  isPaid: boolean;
  amount: number;
  student: { id: string; name: string; avatarUrl?: string | null; email: string };
};
