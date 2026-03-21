import { z } from 'zod';

export const planFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  description: z.string(),
  price: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
    message: 'El precio debe ser un número válido.',
  }),
  credits: z.string().refine((v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 0, {
    message: 'Los créditos deben ser un número válido.',
  }),
  intervalType: z.enum(['MONTHLY', 'WEEKLY', 'FIXED_PACKAGE'], {
    message: 'Tipo de intervalo inválido.',
  }),
  intervalValue: z.string().refine((v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1, {
    message: 'El valor de intervalo debe ser al menos 1.',
  }),
});

export type PlanFormValues = z.infer<typeof planFormSchema>;
