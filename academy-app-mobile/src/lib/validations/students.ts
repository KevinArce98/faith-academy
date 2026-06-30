import { z } from 'zod';

export const createStudentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.email('Email inválido'),
  phone: z.string().optional(),
  planId: z.string().min(1).optional().or(z.literal('')),
  enrollmentFee: z.string().optional(),
  enrolledAt: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
