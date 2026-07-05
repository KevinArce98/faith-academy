import { getInitials } from '@/utils/general';

type StudentInitialsProps = {
  name: string;
  avatarUrl?: string | null;
};

export function StudentInitials({ name, avatarUrl }: StudentInitialsProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="bg-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
      <span className="text-xs font-bold text-white">{getInitials(name)}</span>
    </div>
  );
}
