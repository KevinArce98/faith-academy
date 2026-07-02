// Respuesta de /api/v1/monthly-attendance/me.
export type EnrollData = {
  enrolledClassIds: string[];
  active: boolean;
  allowance: number | null; // null = ilimitado
  needsRenewal: boolean;
  singleClass: boolean; // clase suelta → la clase ya está reservada
  expiresAt: string | null;
};
