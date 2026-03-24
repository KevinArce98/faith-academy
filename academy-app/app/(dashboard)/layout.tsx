import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { Role } from '@/lib/roles';
import { getInitials } from '@/utils/general';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, isAuthenticated } = await auth();
  if (!userId && !isAuthenticated) redirect('/sign-in');

  const user = await getCurrentUser();
  if (!user) redirect('/no-access');

  const initials = getInitials(user.name ?? '');

  return (
    <DashboardShell user={{ name: user.name ?? '', role: user.role as Role, initials }}>
      {children}
    </DashboardShell>
  );
}
