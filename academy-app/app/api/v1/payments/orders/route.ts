import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { createOrderSchema } from '@/lib/validations/payments';

export async function POST(req: Request) {
  let user;
  try {
    user = await requireRole('STUDENT');
  } catch {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { planId, receiptKey } = parsed.data;

  // Verify plan belongs to the student's studio
  const plan = await db.membershipPlan.findFirst({
    where: { id: planId, isActive: true },
  });
  if (!plan) {
    return Response.json({ error: 'Plan no encontrado' }, { status: 404 });
  }

  const receiptUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${receiptKey}`;

  const order = await db.membershipOrder.create({
    data: {
      studentId: user.id,
      planId,
      receiptUrl,
      status: 'PENDING_REVIEW',
    },
  });

  return Response.json(order, { status: 201 });
}
