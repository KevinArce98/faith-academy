import { z } from 'zod';

// Un slot del horario: día de la semana (1=Lun..7=Dom) + hora inicio/fin "HH:mm".
export const slotSchema = z.object({
	dayOfWeek: z.number().int().min(1).max(7),
	startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
	endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
});

// Clase recurrente (Ballet, Jazz…) con su profesor y su horario (slots).
export const createClassSchema = z.object({
	name: z.string().min(1, 'El nombre es requerido'),
	teacherId: z.string().min(1, 'El profesor es requerido'),
	slots: z.array(slotSchema).optional(),
	skillLevel: z
		.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER'])
		.optional(),
	maxCapacity: z.number().int().nonnegative().optional(),
	description: z.string().optional(),
	isPrivate: z.boolean().optional(),
	// Clase única: fecha puntual "YYYY-MM-DD" (con un solo slot para la hora).
	oneOffDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
		.nullable()
		.optional(),
});

export const updateClassSchema = createClassSchema.partial();
