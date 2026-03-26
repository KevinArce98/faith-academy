type StatCardProps = {
  title: string;
  value: string;
  change?: number;
  suffix?: string;
};

export function StatCard({ title, value, change, suffix = '' }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-muted-foreground text-sm">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {change !== undefined && (
        <p
          className={`mt-1 text-xs font-medium ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {change >= 0 ? '+' : ''}
          {change}
          {suffix} vs mes anterior
        </p>
      )}
    </div>
  );
}
