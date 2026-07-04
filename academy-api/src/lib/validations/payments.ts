import { z } from 'zod';

export const uploadUrlSchema = z.object({
	studentId: z.string().min(1),
	ext: z.enum(['jpg', 'jpeg', 'png', 'pdf', 'webp']),
});

export const createOrderSchema = z.object({
	planId: z.string().min(1),
	receiptKey: z.string().min(1),
	// Reserva de clase suelta: el alumno elige clase + fecha de la sesión.
	bookingClassId: z.string().min(1).optional(),
	bookingDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
		.optional(),
});

export const rejectOrderSchema = z.object({
	notes: z.string().optional().default(''),
});

// Matrícula: el alumno sube su comprobante (monto = su enrollmentFee, no viaja).
export const createEnrollmentSchema = z.object({
	receiptKey: z.string().min(1),
});

// Admin marca la matrícula de un alumno como pagada (sin comprobante).
export const markEnrollmentPaidSchema = z.object({
	studentId: z.string().min(1),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;
