import { z } from 'zod';

const matriculaFields = {
	// Matrícula: pago único de inscripción.
	enrollmentFee: z
		.number()
		.nonnegative('La matrícula debe ser válida')
		.optional(),
	enrolledAt: z.string().optional(), // fecha de matrícula (ISO o YYYY-MM-DD)
};

export const createStudentSchema = z.object({
	name: z.string().min(1, 'El nombre es requerido'),
	email: z.email('Email inválido'),
	phone: z.string().optional(),
	planId: z.string().min(1).optional().or(z.literal('')),
	notes: z.string().optional(),
	...matriculaFields,
});

export const updateStudentSchema = z.object({
	name: z.string().min(1, 'El nombre es requerido'),
	email: z.email('Email inválido'),
	phone: z.string().optional(),
	planId: z.string().min(1).optional().or(z.literal('')),
	notes: z.string().optional(),
	...matriculaFields,
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
