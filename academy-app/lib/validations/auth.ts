import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  remember: z.boolean().optional(),
});

export const signUpSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const verifyCodeSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Email inválido'),
});

export const resetPasswordSchema = z
  .object({
    code: z.string().min(1, 'El código es requerido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma la contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type VerifyCodeFormValues = z.infer<typeof verifyCodeSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
