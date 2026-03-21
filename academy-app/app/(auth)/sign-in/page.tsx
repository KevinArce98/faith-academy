'use client';

import { useAuth, useSignIn } from '@clerk/nextjs';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { handleClerkErrors } from '@/utils/clerk-localization';
import {
  signInSchema,
  verifyCodeSchema,
  type SignInFormValues,
  type VerifyCodeFormValues,
} from '@/lib/validations/auth';

export default function SignInPage() {
  const { isSignedIn } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [clerkError, setClerkError] = useState<string | null>(null);

  const {
    register: registerSignIn,
    handleSubmit: handleSignInSubmit,
    formState: { errors: signInErrors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', remember: false },
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

  async function onSignIn(form: SignInFormValues) {
    setClerkError(null);
    try {
      const { error } = await signIn.password({
        emailAddress: form.email,
        password: form.password,
      });
      if (error) {
        if (isClerkAPIResponseError(error)) {
          setClerkError(handleClerkErrors(error.errors));
        } else {
          setClerkError('Error al iniciar sesión. Intenta de nuevo.');
        }
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);
              return;
            }
            const role =
              (session?.user?.publicMetadata?.role as string) ?? 'STUDENT';
            const dest =
              role === 'TEACHER' || role === 'ADMIN' ? '/teacher/scanner' : '/';
            const url = decorateUrl(dest);
            if (url.startsWith('http')) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });
      } else if (
        signIn.status === 'needs_client_trust' ||
        signIn.status === 'needs_second_factor'
      ) {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === 'email_code'
        );
        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
        }
      } else {
        console.error('Sign-in attempt not complete:', signIn);
      }
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setClerkError(handleClerkErrors(err.errors));
      } else {
        setClerkError('Error al iniciar sesión. Intenta de nuevo.');
      }
    }
  }

  async function onVerify(form: VerifyCodeFormValues) {
    setClerkError(null);
    const { error } = await signIn.mfa.verifyEmailCode({ code: form.code });
    if (error) {
      if (isClerkAPIResponseError(error)) {
        setClerkError(handleClerkErrors(error.errors));
      } else {
        setClerkError('Error al verificar el código. Intenta de nuevo.');
      }
      return;
    }
    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session?.currentTask);
            return;
          }
          const role =
            (session?.user?.publicMetadata?.role as string) ?? 'STUDENT';
          const dest =
            role === 'TEACHER' || role === 'ADMIN' ? '/teacher/scanner' : '/';
          const url = decorateUrl(dest);
          if (url.startsWith('http')) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    } else {
      console.error('Sign-in attempt not complete:', signIn);
    }
  }

  /* ── Verification step (needs_client_trust / needs_second_factor) ── */
  if (
    signIn.status === 'needs_client_trust' ||
    signIn.status === 'needs_second_factor'
  ) {
    return (
      <>
        <h2 className="text-dark text-[28px] leading-tight font-bold">
              Verifica tu identidad
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Ingresa el código que enviamos a tu correo electrónico
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
                {fetchStatus === 'fetching' ? 'Verificando...' : 'Verificar'}
              </Button>
            </form>
            <div className="mt-4 flex flex-col gap-2 text-center">
              <Button
                variant="text"
                color="primary"
                onClick={() => signIn.mfa.sendEmailCode()}
                className="h-auto p-0 text-sm font-medium hover:bg-transparent"
              >
                Reenviar código
              </Button>
              <Button
                variant="text"
                color="neutral"
                onClick={() => signIn.reset()}
                className="h-auto p-0 text-sm hover:bg-transparent"
              >
                Volver al inicio de sesión
              </Button>
            </div>
      </>
    );
  }

  /* ── Main sign-in form ───────────────────────────────────────── */
  return (
    <>
      {/* Encabezado del formulario */}
      <h2 className="text-dark text-[28px] leading-tight font-bold">
            Bienvenido de nuevo
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Ingresa tus credenciales para continuar
          </p>

          {clerkError && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {clerkError}
            </p>
          )}

          <form onSubmit={handleSignInSubmit(onSignIn)} className="mt-8 flex flex-col gap-5">
            {/* Email */}
            <Input
              type="email"
              label="Email"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              className="h-12 rounded-xl"
              error={signInErrors.email?.message}
              {...registerSignIn('email')}
            />

            {/* Contraseña */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="password"
                className="text-dark text-sm font-medium"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="text-dark focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border border-gray-200 px-4 pr-12 text-sm transition-colors outline-none placeholder:text-gray-400 focus:ring-2"
                  {...registerSignIn('password')}
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  variant="text"
                  color="neutral"
                  className="h-auto absolute top-1/2 right-4 -translate-y-1/2 p-0 hover:bg-transparent border-transparent"
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </Button>
              </div>
            </div>

            {/* Recordarme + ¿Olvidaste tu contraseña? */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="accent-primary h-4 w-4 rounded border-gray-300"
                  {...registerSignIn('remember')}
                />
                <span className="text-sm text-gray-500">Recordarme</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Botón Iniciar Sesión */}
            <Button
              type="submit"
              variant="contained"
              size="lg"
              disabled={fetchStatus === 'fetching'}
              className="w-full rounded-xl"
            >
              {fetchStatus === 'fetching' ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Separador */}
          <p className="mt-6 text-center text-sm text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link
              href="/sign-up"
              className="text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              Regístrate
            </Link>
          </p>
    </>
  );
}
