'use client';

import { useAuth, useSignUp } from '@clerk/nextjs';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { createUserProfileAction } from '@/actions/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { handleClerkErrors } from '@/utils/clerk-localization';
import {
  signUpSchema,
  verifyCodeSchema,
  type SignUpFormValues,
  type VerifyCodeFormValues,
} from '@/lib/validations/auth';

export default function SignUpPage() {
  const { isSignedIn } = useAuth();
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [clerkError, setClerkError] = useState<string | null>(null);

  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const {
    register: registerVerify,
    handleSubmit: handleVerifySubmit,
    formState: { errors: verifyErrors },
  } = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (isSignedIn) router.replace('/');
  }, [isSignedIn, router]);

  async function onSignUp(form: SignUpFormValues) {
    setClerkError(null);
    setName(form.name);

    try {
      const { error } = await signUp.password({
        emailAddress: form.email,
        password: form.password,
      });
      if (error) {
        if (isClerkAPIResponseError(error)) {
          setClerkError(handleClerkErrors(error.errors));
        } else {
          setClerkError('Error al crear la cuenta. Intenta de nuevo.');
        }
        return;
      }

      await signUp.verifications.sendEmailCode();
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setClerkError(handleClerkErrors(err.errors));
      } else {
        setClerkError('Error al crear la cuenta. Intenta de nuevo.');
      }
    }
  }

  async function onVerify(form: VerifyCodeFormValues) {
    setClerkError(null);
    const { error } = await signUp.verifications.verifyEmailCode({ code: form.code });
    if (error) {
      if (isClerkAPIResponseError(error)) {
        setClerkError(handleClerkErrors(error.errors));
      } else {
        setClerkError('Error al verificar el código. Intenta de nuevo.');
      }
      return;
    }

    if (signUp.status === 'complete') {
      const { error } = await createUserProfileAction(
        signUp.createdUserId!,
        signUp.emailAddress!,
        name,
      );
      if (error) {
        console.error('Error creating user profile:', error);
        return;
      }

      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session?.currentTask);
            return;
          }
          const url = decorateUrl('/');
          if (url.startsWith('http')) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    } else {
      console.error('Sign-up attempt not complete:', signUp);
    }
  }

  /* ── Verification step ──────────────────────────────────────── */
  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  ) {
    return (
      <>
        <h2 className="text-dark text-[28px] leading-tight font-bold">
              Verifica tu correo
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Enviamos un código de 6 dígitos a tu dirección de email
            </p>

            <form onSubmit={handleVerifySubmit(onVerify)} className="mt-8 flex flex-col gap-5">
              <Input
                label="Código de verificación"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="h-12 rounded-xl tracking-widest"
                error={verifyErrors.code?.message}
                {...registerVerify('code')}
              />

              <Button
                type="submit"
                variant="contained"
                size="lg"
                disabled={fetchStatus === 'fetching'}
                className="w-full rounded-xl"
              >
                {fetchStatus === 'fetching' ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verificando...
                  </>
                ) : (
                  'Verificar cuenta'
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-400">
              ¿No recibiste el código?{' '}
              <Button
                variant="text"
                color="primary"
                onClick={() => signUp.verifications.sendEmailCode()}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Reenviar
              </Button>
            </p>
      </>
    );
  }

  /* ── Main sign-up form ──────────────────────────────────────── */
  return (
    <>
      <h2 className="text-dark text-[28px] leading-tight font-bold">
            Crea tu cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Ingresa tus datos para comenzar
          </p>

          {clerkError && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {clerkError}
            </p>
          )}

          <form onSubmit={handleSignUpSubmit(onSignUp)} className="mt-8 flex flex-col gap-5">
            {/* Nombre */}
            <Input
              label="Nombre completo"
              placeholder="Juan Pérez"
              autoComplete="name"
              className="h-12 rounded-xl"
              error={signUpErrors.name?.message}
              {...registerSignUp('name')}
            />

            {/* Email */}
            <Input
              type="email"
              label="Email"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              className="h-12 rounded-xl"
              error={signUpErrors.email?.message}
              {...registerSignUp('email')}
            />

            {/* Contraseña */}
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-dark text-sm font-medium">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="text-dark focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border border-gray-200 px-4 pr-12 text-sm transition-colors outline-none placeholder:text-gray-400 focus:ring-2"
                  {...registerSignUp('password')}
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  variant="text"
                  color="neutral"
                  className="h-auto absolute top-1/2 right-4 -translate-y-1/2 p-0 hover:bg-transparent border-transparent"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </Button>
              </div>
              {signUpErrors.password && (
                <p className="text-danger text-xs">
                  {signUpErrors.password?.message}
                </p>
              )}
            </div>

            {/* Captcha – required by Clerk bot protection */}
            <div id="clerk-captcha" />

            {/* Botón Crear cuenta */}
            <Button
              type="submit"
              variant="contained"
              size="lg"
              disabled={fetchStatus === 'fetching'}
              className="w-full rounded-xl"
            >
              {fetchStatus === 'fetching' ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta'
              )}
            </Button>
          </form>

          {/* Separador */}
          <p className="mt-6 text-center text-sm text-gray-400">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/sign-in"
              className="text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
    </>
  );
}

