export type PendingPayment = {
  subscriptionId: string | null;
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string | null;
  planName: string;
  amount: number;
  status: 'pending' | 'expired';
};

export type AdminDashboard = {
  userName: string;
  activeStudents: number;
  monthCollected: number;
  monthPending: number;
  teacherPayout: number;
  pendingCount: number;
  pendingPayments: PendingPayment[];
  newStudents: {
    id: string;
    name: string | null;
    avatarUrl?: string | null;
    email: string;
    planName: string | null;
  }[];
};

export type TeacherSlot = { dayOfWeek: number; startTime: string; endTime: string };
export type TeacherClass = {
  id: string;
  name: string;
  skillLevel: string;
  slots: TeacherSlot[];
  oneOffDate: string | null;
  students: number;
};
export type TeacherDashboard = {
  userName: string;
  totalClasses: number;
  totalStudents: number;
  hoursThisMonth: number;
  classes: TeacherClass[];
};

export type StudentDashboard = {
  userName: string;
  subscription: { planName: string; amount: number; isPaid: boolean } | null;
  planActive: boolean;
  planExpired: boolean;
  expiresAt: string | null;
  classesThisMonth: { id: string; name: string }[];
  enrollmentFee: number | null;
};
