// Respuesta de /api/v1/payouts.

export type StudentContribution = {
  studentId: string;
  studentName: string;
  planName: string;
  amount: number;
};

export type ClassLine = {
  classId: string;
  className: string;
  amount: number;
  students: number;
  studentList: StudentContribution[];
};

export type TeacherPayout = {
  teacherId: string;
  teacherName: string;
  total: number;
  hoursWorked: number;
  cost: number;
  net: number;
  classes: ClassLine[];
};

export type PayoutsResponse = {
  period: string;
  totals: {
    collected: number;
    pending: number;
    allocated: number;
    unallocated: number;
  };
  payouts: TeacherPayout[];
};
