'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { db } from '@/lib/db';
import { handleClerkErrors } from '@/utils/clerk-localization';

export type AuthState = {
  error?: string;
};

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos.' };
  }

  try {
    const { createClerkClient } = await import('@clerk/nextjs/server');
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Buscar usuario por email
    const { data: users } = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    const clerkUser = users?.[0];
    if (!clerkUser) {
      return { error: 'Credenciales inválidas. Intenta de nuevo.' };
    }

    // Verificar contraseña con la API de Clerk
    const verified = await clerk.users.verifyPassword({
      userId: clerkUser.id,
      password,
    });

    if (!verified) {
      return { error: 'Credenciales inválidas. Intenta de nuevo.' };
    }

    // Obtener rol desde publicMetadata
    const role = (clerkUser.publicMetadata?.role as string) ?? 'STUDENT';

    // Crear sesión de usuario
    const session = await clerk.sessions.createSession({
      userId: clerkUser.id,
    });

    const { jwt } = await clerk.sessions.getToken(session.id);

    const cookieStore = await cookies();
    cookieStore.set('__session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Redirigir según rol
    if (role === 'TEACHER' || role === 'ADMIN') {
      redirect('/teacher/scanner');
    }

    redirect('/dashboard');
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }

    let message = 'Error al iniciar sesión. Intenta de nuevo.';
    if (isClerkAPIResponseError(error)) {
      message = handleClerkErrors(error.errors);
    }

    return { error: message };
  }
}

export async function createUserProfileAction(
  clerkId: string,
  email: string,
  name: string
): Promise<{ error?: string }> {
  try {
    await db.userProfile.create({
      data: { clerkId, email, name, role: 'STUDENT' },
    });
    return {};
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string };
    // P2002 = unique constraint — profile already exists, treat as OK
    if (e.code === 'P2002') return {};
    console.error('Error creating user profile:', e.message);
    return { error: 'Error al crear el perfil de usuario.' };
  }
}
