import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

const createClassSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER']),
  teacherId: z.string().min(1, 'El profesor es requerido'),
  maxCapacity: z.number().int().positive(),
  cancelWindowHours: z.number().int().nonnegative(),
  description: z.string().optional(),
  occurrences: z
    .array(z.object({ startsAt: z.string(), endsAt: z.string() }))
    .min(1, 'Selecciona al menos un dia'),
});

export async function POST(req: Request) {
  try {
    await requireRole('ADMIN');
  } catch {
    return Response.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, skillLevel, teacherId, maxCapacity, cancelWindowHours, description, occurrences } =
    parsed.data;

  const classes = await db.$transaction(
    occurrences.map((occ) =>
      db.class.create({
        data: {
          name,
          skillLevel,
          teacherId,
          maxCapacity,
          cancelWindowHours,
          description: description || null,
          startsAt: new Date(occ.startsAt),
          endsAt: new Date(occ.endsAt),
        },
      })
    )
  );

  return Response.json({ classes }, { status: 201 });
}
