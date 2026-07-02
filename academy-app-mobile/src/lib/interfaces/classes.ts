export type Slot = { dayOfWeek: number; startTime: string; endTime: string };

export type AssignableTeacher = { id: string; name: string | null };

/** Clase tal como la devuelve GET /classes (admin/teacher). */
export type Cls = {
  id: string;
  name: string;
  skillLevel: string;
  schedule?: string | null;
  slots?: Slot[];
  teacherId: string;
  description?: string | null;
  maxCapacity?: number;
  isPrivate?: boolean;
  oneOffDate?: string | null;
  _count?: { attendances: number };
};

/** Clase reducida para el alumno (GET /classes con rol STUDENT). */
export type StudentCls = {
  id: string;
  name: string;
  skillLevel: string;
  schedule?: string | null;
  isPrivate?: boolean;
};
