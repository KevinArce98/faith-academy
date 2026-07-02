// Respuestas de /api/v1/dashboard/{admin,teacher,student}.

export type PendingPayment = {
  subscriptionId: string | null;
  studentId: string;
  studentName: string;
  studentEmail: string;
  planId: string;
  planName: string;
  amount: number;
  status: 'pending' | 'expired';
};

export type ClassStat = {
  classId: string;
  className: string;
  teacherName: string;
  students: number;
  revenue: number;
};

export type NewStudent = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  planName: string | null;
};

export type AdminDashboardData = {
  userName: string;
  activeStudents: number;
  monthCollected: number;
  monthPending: number;
  teacherPayout: number;
  pendingCount: number;
  pendingPayments: PendingPayment[];
  classStats: ClassStat[];
  newStudents: NewStudent[];
};

export type TeacherSlot = { dayOfWeek: number; startTime: string; endTime: string };

export type TeacherClass = {
  id: string;
  name: string;
  skillLevel: string;
  schedule: string | null;
  slots: TeacherSlot[];
  oneOffDate: string | null;
  students: number;
  sessionsGiven: number;
  avgAttendance: number;
};

export type TeacherDashboardData = {
  userName: string;
  totalClasses: number;
  totalStudents: number;
  hoursThisMonth: number;
  classes: TeacherClass[];
};

export type StudentDashboardData = {
  userName: string;
  enrollmentFee: number | null;
  subscription: { planName: string; amount: number; isPaid: boolean } | null;
  planActive: boolean;
  planExpired: boolean;
  expiresAt: string | null;
  classesThisMonth: { id: string; name: string }[];
};
