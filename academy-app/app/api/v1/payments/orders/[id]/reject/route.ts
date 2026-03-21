import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { rejectOrderSchema } from '@/lib/validations/payments';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireRole('ADMIN');
  } catch {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = rejectOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const order = await db.membershipOrder.findUnique({ where: { id } });

  if (!order) {
    return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  if (order.status !== 'PENDING_REVIEW') {
    return Response.json(
      { error: 'La orden no está en estado PENDING_REVIEW' },
      { status: 409 }
    );
  }

  const updated = await db.membershipOrder.update({
    where: { id },
    data: {
      status: 'REJECTED',
      notes: parsed.data.notes,
    },
  });

  return Response.json(updated);
}
