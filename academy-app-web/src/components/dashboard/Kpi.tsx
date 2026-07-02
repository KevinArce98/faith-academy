import type { LucideIcon } from 'lucide-react';

export function Kpi({
  label,
  value,
  icon: Icon,
  sub,
  subColor = 'text-gray-400',
  valueColor = 'text-dark',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  sub?: string;
  subColor?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-2 flex items-start justify-between md:mb-3">
        <p className="text-xs text-gray-400 md:text-sm">{label}</p>
        <Icon className="h-4 w-4 text-gray-300 md:h-5 md:w-5" />
      </div>
      <p className={`mb-1 text-2xl font-bold md:text-4xl ${valueColor}`}>{value}</p>
      {sub && <p className={`text-xs font-medium ${subColor}`}>● {sub}</p>}
    </div>
  );
}
