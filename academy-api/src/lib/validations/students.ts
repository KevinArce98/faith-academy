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
	// Acepta string vacío ("sin plan" desde el form), string con id, o
	// null/undefined (algunos clientes mandan null en vez de omitir la key).
	planId: z.string().nullish(),
	notes: z.string().optional(),
	...matriculaFields,
});

export const updateStudentSchema = z.object({
	name: z.string().min(1, 'El nombre es requerido'),
	email: z.email('Email inválido'),
	phone: z.string().optional(),
	// Acepta string vacío ("sin plan" desde el form), string con id, o
	// null/undefined (algunos clientes mandan null en vez de omitir la key).
	planId: z.string().nullish(),
	notes: z.string().optional(),
	...matriculaFields,
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
