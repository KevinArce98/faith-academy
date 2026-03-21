import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  remember: z.boolean().optional(),
});

export const signUpSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const verifyCodeSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type VerifyCodeFormValues = z.infer<typeof verifyCodeSchema>;
