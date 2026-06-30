export interface Stats {
  totalRevenue: number;
  revenueChange: number;
  activeStudents: number;
  newStudentsCount: number;
  newStudentsChange: number;
  renewalRate: number;
  avgWeeklyClasses: number;
}

export interface PopularClass {
  name: string;
  attended: number;
  capacity: number | null;
}

export interface PlanData {
  name: string;
  count: number;
}

export interface ReportsClientProps {
  stats: Stats;
  monthlyRevenue: { month: string; revenue: number }[];
  popularClasses: PopularClass[];
  planData: PlanData[];
}
