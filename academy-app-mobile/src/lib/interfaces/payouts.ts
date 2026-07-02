export type PayoutClassLine = {
  classId: string;
  className: string;
  amount: number;
  students: number;
};

export type TeacherPayout = {
  teacherId: string;
  teacherName: string;
  total: number;
  hoursWorked: number;
  net: number;
  classes: PayoutClassLine[];
};

export type PayoutsResponse = {
  period: string;
  totals: { collected: number; pending: number; allocated: number; unallocated: number };
  payouts: TeacherPayout[];
};
