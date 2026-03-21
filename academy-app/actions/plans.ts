'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import type { PlanFormValues } from '@/interfaces/plans';

function parsePlanForm(values: PlanFormValues) {
  const credits = parseInt(values.credits, 10);
  const intervalValue = parseInt(values.intervalValue, 10);
  const price = parseFloat(values.price);

  if (!values.name.trim()) throw new Error('El nombre es requerido.');
  if (isNaN(price) || price < 0) throw new Error('El precio debe ser un número válido.');
  if (isNaN(credits) || credits < 0) throw new Error('Los créditos deben ser un número válido.');
  if (isNaN(intervalValue) || intervalValue < 1) throw new Error('El valor de intervalo debe ser al menos 1.');
  if (!['MONTHLY', 'WEEKLY', 'FIXED_PACKAGE'].includes(values.intervalType))
    throw new Error('Tipo de intervalo inválido.');

  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    price,
    credits,
    intervalType: values.intervalType as 'MONTHLY' | 'WEEKLY' | 'FIXED_PACKAGE',
    intervalValue,
  };
}

export async function createPlan(
  values: PlanFormValues
): Promise<{ error?: string }> {
  try {
    await requireRole('ADMIN');
    const data = parsePlanForm(values);

    await db.membershipPlan.create({ data: { ...data, isActive: true } });
    revalidatePath('/plans');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === 'UNAUTHENTICATED' || e.message === 'UNAUTHORIZED')
      return { error: 'No tienes permiso para realizar esta acción.' };
    return { error: e.message ?? 'Error al crear el plan.' };
  }
}

export async function updatePlan(
  id: string,
  values: PlanFormValues
): Promise<{ error?: string }> {
  try {
    await requireRole('ADMIN');
    const data = parsePlanForm(values);

    await db.membershipPlan.update({ where: { id }, data });
    revalidatePath('/plans');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === 'UNAUTHENTICATED' || e.message === 'UNAUTHORIZED')
      return { error: 'No tienes permiso para realizar esta acción.' };
    return { error: e.message ?? 'Error al actualizar el plan.' };
  }
}

export async function deletePlan(id: string): Promise<{ error?: string }> {
  try {
    await requireRole('ADMIN');

    const plan = await db.membershipPlan.findUnique({
      where: { id },
      include: { _count: { select: { orders: { where: { status: 'ACTIVE' } } } } },
    });

    if (!plan) return { error: 'Plan no encontrado.' };
    if (plan._count.orders > 0)
      return { error: 'No puedes eliminar un plan con alumnos activos.' };

    await db.membershipPlan.delete({ where: { id } });
    revalidatePath('/plans');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === 'UNAUTHENTICATED' || e.message === 'UNAUTHORIZED')
      return { error: 'No tienes permiso para realizar esta acción.' };
    return { error: e.message ?? 'Error al eliminar el plan.' };
  }
}

export async function togglePlanActive(
  id: string,
  isActive: boolean
): Promise<{ error?: string }> {
  try {
    await requireRole(['ADMIN', 'TEACHER']);
    await db.membershipPlan.update({ where: { id }, data: { isActive } });
    revalidatePath('/plans');
    return {};
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === 'UNAUTHENTICATED' || e.message === 'UNAUTHORIZED')
      return { error: 'No tienes permiso para realizar esta acción.' };
    return { error: e.message ?? 'Error al actualizar el plan.' };
  }
}
