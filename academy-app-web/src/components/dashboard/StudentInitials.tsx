import { getInitials } from '@/utils/general';

export function StudentInitials({ name }: { name: string }) {
  return (
    <div className="bg-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
      <span className="text-xs font-bold text-white">{getInitials(name)}</span>
    </div>
  );
}
