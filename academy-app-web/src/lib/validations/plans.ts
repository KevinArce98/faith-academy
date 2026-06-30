import { z } from 'zod';

export const planFormSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido.'),
    description: z.string(),
    price: z.string().refine((v: string) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: 'El precio debe ser un número válido.',
    }),
    classesPerWeek: z.string(),
    unlimited: z.boolean(),
    isPublic: z.boolean(),
    isSingleClass: z.boolean(),
  })
  .refine(
    (d) =>
      d.unlimited || (/^\d+$/.test(d.classesPerWeek.trim()) && parseInt(d.classesPerWeek, 10) >= 1),
    {
      message: 'Las clases por semana deben ser al menos 1.',
      path: ['classesPerWeek'],
    }
  );

export type PlanFormValues = z.infer<typeof planFormSchema>;
