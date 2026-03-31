import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import studioConfig from '@/lib/config/studio.config';
import { formatPrice } from '@/utils/general';
import { StatCard } from '@/components/dashboard/reports/StatCard';
import type { ReportsClientProps } from '@/components/dashboard/reports/reports.types';

const COLORS = [
  studioConfig.colors.primary,
  studioConfig.colors.primaryLight,
  studioConfig.colors.primaryDark,
  studioConfig.colors.darkLight,
  studioConfig.colors.darkMid,
];

export function ReportsClient({
  stats,
  monthlyRevenue,
  popularClasses,
  planData,
}: ReportsClientProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="space-y-6 p-0 md:p-6">
      <h1 className="text-2xl font-bold">Reportes</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard title="Ingresos del mes" value={formatPrice(stats.totalRevenue)} change={stats.revenueChange} suffix="%" />
        <StatCard title="Alumnos activos" value={String(stats.activeStudents)} />
        <StatCard title="Nuevos alumnos" value={String(stats.newStudentsCount)} change={stats.newStudentsChange} suffix="%" />
        <StatCard title="Tasa de renovación" value={`${stats.renewalRate}%`} />
      </div>

      {/* Monthly Revenue Chart */}
      <div className="rounded-xl border bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-lg font-semibold">Ingresos últimos 12 meses</h2>
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
          <BarChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => formatPrice(Number(value ?? 0))} />
            <Bar dataKey="revenue" fill={studioConfig.colors.primary} radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Popular Classes */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Clases más populares</h2>
          <div className="space-y-3">
            {popularClasses.map((cls) => (
              <div key={cls.name}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{cls.name}</span>
                  <span className="text-muted-foreground">{cls.attended} asistencias</span>
                </div>
                {cls.capacity != null && cls.capacity > 0 && (
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: studioConfig.colors.primary,
                        width: `${Math.min((cls.attended / cls.capacity) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Distribución de planes</h2>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 240}>
              <PieChart>
                <Pie
                  data={planData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {planData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm">Sin datos de planes.</p>
          )}
        </div>
      </div>
    </div>
  );
}
