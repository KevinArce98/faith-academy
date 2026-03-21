import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { PlansClient } from '@/components/dashboard/PlansClient';
import { isAdminOrTeacher } from '@/lib/roles';
import type { Role } from '@/lib/roles';

export default async function PlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const isManager = isAdminOrTeacher(user.role as Role);

  const raw = await db.membershipPlan.findMany({
    where: isManager ? {} : { isActive: true },
    orderBy: { price: 'asc' },
    include: {
      _count: { select: { orders: { where: { status: 'ACTIVE' } } } },
    },
  });

  // Serialize Prisma Decimal → number so it can be passed to a Client Component
  const plans = raw.map((p) => ({ ...p, price: Number(p.price) }));

  return <PlansClient plans={plans} isAdmin={isManager} />;
}
