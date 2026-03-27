'use server';

import { revalidatePath } from 'next/cache';
import { createClerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { createUserProfile, requireRole } from '@/lib/auth';

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '@#$%&*';
  const all = upper + lower + numbers + special;
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  const rest = Array.from({ length: 8 }, () =>
    all[Math.floor(Math.random() * all.length)],
  );
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}

export async function createTeacherAction(formData: {
  name: string;
  email: string;
}) {
  await requireRole('ADMIN');
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });
  const tempPassword = generateTempPassword();

  const clerkUser = await clerk.users.createUser({
    emailAddress: [formData.email],
    firstName: formData.name.split(' ')[0],
    lastName: formData.name.split(' ').slice(1).join(' ') || undefined,
    password: tempPassword,
    publicMetadata: { role: 'TEACHER' },
  });

  const userProfile = await createUserProfile({
    clerkId: clerkUser.id,
    email: formData.email,
    name: formData.name,
    role: 'TEACHER',
  });

  revalidatePath('/teachers');
  revalidatePath('/classes');

  return { success: true, userId: userProfile.id, tempPassword } as const;
}

export async function changeUserRoleAction(
  userId: string,
  role: 'ADMIN' | 'TEACHER' | 'STUDENT',
) {
  await requireRole('ADMIN');
  const user = await db.userProfile.update({
    where: { id: userId },
    data: { role },
  });

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  await clerk.users.updateUser(user.clerkId, {
    publicMetadata: { role },
  });

  revalidatePath('/students');
  revalidatePath('/teachers');
  revalidatePath('/classes');

  return { success: true } as const;
}
