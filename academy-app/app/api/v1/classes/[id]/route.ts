import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const updateClassSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  skillLevel: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER'])
    .optional(),
  teacherId: z.string().min(1, 'El profesor es requerido').optional(),
  maxCapacity: z.number().int().positive().optional(),
  cancelWindowHours: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN');
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;

  // Verificar que la clase existe
  const existingClass = await db.class.findUnique({
    where: { id },
  });

  if (!existingClass) {
    return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  const {
    name,
    skillLevel,
    teacherId,
    maxCapacity,
    cancelWindowHours,
    description,
    startsAt,
    endsAt,
  } = parsed.data;

  if (name !== undefined) updateData.name = name;
  if (skillLevel !== undefined) updateData.skillLevel = skillLevel;
  if (teacherId !== undefined) updateData.teacherId = teacherId;
  if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity;
  if (cancelWindowHours !== undefined)
    updateData.cancelWindowHours = cancelWindowHours;
  if (description !== undefined) updateData.description = description || null;
  if (startsAt !== undefined) updateData.startsAt = new Date(startsAt);
  if (endsAt !== undefined) updateData.endsAt = new Date(endsAt);

  // Validar que si se actualizan las horas, la hora de fin sea posterior a la de inicio
  if (startsAt && endsAt) {
    const startTime = new Date(startsAt);
    const endTime = new Date(endsAt);
    if (endTime <= startTime) {
      return NextResponse.json(
        { error: 'La hora de fin debe ser posterior a la hora de inicio' },
        { status: 400 }
      );
    }
  }

  const updatedClass = await db.class.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ class: updatedClass }, { status: 200 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN');
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;

  // Verificar que la clase existe
  const existingClass = await db.class.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          attendances: true,
        },
      },
    },
  });

  if (!existingClass) {
    return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
  }

  // Verificar si hay asistentes reservados
  if (existingClass._count.attendances > 0) {
    return NextResponse.json(
      {
        error:
          'No se puede eliminar una clase con inscritos. Primero elimine las reservas.',
      },
      { status: 400 }
    );
  }

  // Eliminar la clase
  await db.class.delete({
    where: { id },
  });

  return NextResponse.json(
    { message: 'Clase eliminada exitosamente' },
    { status: 200 }
  );
}
