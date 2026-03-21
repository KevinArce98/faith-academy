import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { StudentsClient } from '@/components/dashboard/students/StudentsClient';

export default async function StudentsPage() {
  try {
    await requireRole(['ADMIN', 'TEACHER']);
  } catch {
    redirect('/');
  }

  const [students, plans, total] = await Promise.all([
    db.userProfile.findMany({
      where: { role: 'STUDENT' },
      include: {
        orders: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        familyMember: { include: { family: true } },
      },
      orderBy: { name: 'asc' },
      take: 50,
    }),
    db.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    }),
    db.userProfile.count({
      where: { role: 'STUDENT' },
    }),
  ]);

  // Serialize dates for client component
  const serialized = students.map((s) => ({
    ...s,
    createdAt: s.createdAt,
    orders: s.orders.map((o) => ({
      ...o,
      createdAt: o.createdAt,
      startsAt: o.startsAt,
      expiresAt: o.expiresAt,
      approvedAt: o.approvedAt,
      plan: {
        id: o.plan.id,
        name: o.plan.name,
        price: Number(o.plan.price),
      },
    })),
  }));

  return (
    <StudentsClient
      students={serialized}
      plans={plans.map((p) => ({ id: p.id, name: p.name }))}
      total={total}
    />
  );
}
