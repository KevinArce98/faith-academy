import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { createStudentSchema } from '@/lib/validations/students';
import { clerkClient } from '@clerk/nextjs/server';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { handleClerkErrors } from '@/utils/clerk-localization';

function generateTempPassword(): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '@#$%&*';
  const all     = upper + lower + numbers + special;

  // Garantizar al menos uno de cada tipo
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  // Completar hasta 12 caracteres
  const rest = Array.from({ length: 8 }, () =>
    all[Math.floor(Math.random() * all.length)]
  );
  // Mezclar para que los requeridos no esten siempre al inicio
  return [...required, ...rest]
    .sort(() => Math.random() - 0.5)
    .join('');
}

export async function POST(req: Request) {
  try {
    await requireRole(['ADMIN', 'TEACHER']);
  } catch {
    return Response.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten() }, { status: 422 });
  }

  const { name, email, notes, phone } = parsed.data;
  // Normalize planId: treat empty string as null
  const planId = parsed.data.planId?.trim() || null;

  try {
    const client = await clerkClient();

    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? name;
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

    const tempPassword = generateTempPassword();

    const clerkUser = await client.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      password: tempPassword,
      publicMetadata: { role: 'STUDENT' },
    });

    try {
      const created = await db.$transaction(async (tx) => {
        const profile = await tx.userProfile.create({
          data: {
            clerkId: clerkUser.id,
            email,
            name,
            phone: phone?.trim() ? phone.trim() : null,
            role: 'STUDENT',
          },
        });

        if (planId) {
          await tx.membershipOrder.create({
            data: {
              studentId: profile.id,
              planId,
              status: 'PENDING_REVIEW',
              notes: notes?.trim() ? notes.trim() : null,
            },
          });
        } else {
          console.error('[createStudent] planId is empty — skipping MembershipOrder creation');
        }

        return profile;
      });

      return Response.json(
        { success: true, userId: created.id, tempPassword },
        { status: 201 },
      );
    } catch (dbErr: unknown) {
      // Best-effort cleanup to avoid orphan Clerk users if DB write fails
      try {
        await client.users.deleteUser(clerkUser.id);
      } catch {
        // ignore
      }
      throw dbErr;
    }
  } catch (err: unknown) {
    let message = 'Error al crear el alumno.';
    if (isClerkAPIResponseError(err)) {
      message = handleClerkErrors(err.errors);
    }
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
