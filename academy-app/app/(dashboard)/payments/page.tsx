import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { PaymentsClient } from '@/components/dashboard/PaymentsClient';
import { isAdminOrTeacher } from '@/lib/roles';
import type { Role } from '@/lib/roles';

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const isManager = isAdminOrTeacher(user.role as Role);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const studentFilter = isManager ? {} : { studentId: user.id };

  const [rawOrders, pendingCount, monthCount] = await Promise.all([
    db.membershipOrder.findMany({
      where: studentFilter,
      include: {
        student: { select: { id: true, name: true, email: true } },
        plan: { select: { id: true, name: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.membershipOrder.count({
      where: { ...studentFilter, status: 'PENDING_REVIEW' },
    }),
    db.membershipOrder.count({
      where: { ...studentFilter, createdAt: { gte: monthStart } },
    }),
  ]);

  // Serialize Prisma Decimal → number so it can be passed to a Client Component
  const orders = rawOrders.map((o) => ({
    ...o,
    plan: { ...o.plan, price: Number(o.plan.price) },
  }));

  return (
    <PaymentsClient
      orders={orders}
      pendingCount={pendingCount}
      monthCount={monthCount}
      isAdmin={isManager}
    />
  );
}
