import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { getErrorMessage } from '@/lib/errorMessages';
import {
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { isSignedIn, setToken } = useAuth();
  const api = useApiClient();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [requestedEmail, setRequestedEmail] = useState('');

  const {
    register: registerRequest,
    handleSubmit: handleRequestSubmit,
    formState: { errors: requestErrors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (isSignedIn) navigate('/', { replace: true });
  }, [isSignedIn, navigate]);

  const requestResetMutation = useMutation({
    mutationFn: async (values: ForgotPasswordFormValues) => {
      await api('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: values.email }),
      });
      return values.email;
    },
    onSuccess: (email) => {
      setRequestedEmail(email);
      setStep('reset');
    },
    onError: () => setGeneralError('No pudimos enviar el código. Intenta de nuevo.'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      api<{ token: string }>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: requestedEmail,
          code: values.code,
          password: values.password,
        }),
      }),
    onSuccess: (data) => {
      setToken(data.token);
      navigate('/');
    },
    onError: (err) =>
      setGeneralError(
        getErrorMessage(err, 'No pudimos restablecer la contraseña. Intenta de nuevo.')
      ),
  });

  function onRequestReset(values: ForgotPasswordFormValues) {
    setGeneralError(null);
    requestResetMutation.mutate(values);
  }

  function onResetPassword(values: ResetPasswordFormValues) {
    setGeneralError(null);
    resetPasswordMutation.mutate(values);
  }

  async function handleResendCode() {
    setGeneralError(null);
    try {
      await api('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: requestedEmail }),
      });
    } catch {
      setGeneralError('No pudimos reenviar el código. Intenta de nuevo.');
    }
  }

  if (step === 'reset') {
    return (
      <>
        <h2 className="text-dark text-[28px] leading-tight font-bold">Restablece tu contraseña</h2>
        <p className="mt-2 text-sm text-gray-400">
          Escribe el código que enviamos a {requestedEmail} y crea una nueva contraseña
        </p>

        {generalError && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{generalError}</p>
        )}

        <form onSubmit={handleResetSubmit(onResetPassword)} className="mt-8 flex flex-col gap-5">
          <Input
            label="Código de verificación"
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="tracking-widest"
            error={resetErrors.code?.message}
            {...registerReset('code')}
          />

          <PasswordInput
            label="Nueva contraseña"
            placeholder="Ingresa una nueva contraseña"
            autoComplete="new-password"
            error={resetErrors.password?.message}
            {...registerReset('password')}
          />

          <PasswordInput
            label="Confirmar contraseña"
            placeholder="Repite la nueva contraseña"
            autoComplete="new-password"
            error={resetErrors.confirmPassword?.message}
            {...registerReset('confirmPassword')}
          />

          <Button
            type="submit"
            variant="contained"
            size="lg"
            disabled={resetPasswordMutation.isPending}
            className="w-full"
          >
            {resetPasswordMutation.isPending ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-center text-sm">
          <button
            type="button"
            onClick={handleResendCode}
            className="text-primary hover:text-primary-dark font-semibold"
          >
            Reenviar código
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('request');
              setGeneralError(null);
            }}
            className="text-gray-500 hover:text-dark"
          >
            Usar otro correo
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          ¿Recordaste tu contraseña?{' '}
          <Link to="/sign-in" className="text-primary hover:text-primary-dark font-semibold">
            Inicia sesión
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="text-dark text-[28px] leading-tight font-bold">¿Olvidaste tu contraseña?</h2>
      <p className="mt-2 text-sm text-gray-400">
        Te enviaremos un código para que puedas restablecerla
      </p>

      {generalError && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{generalError}</p>
      )}

      <form onSubmit={handleRequestSubmit(onRequestReset)} className="mt-8 flex flex-col gap-5">
        <Input
          type="email"
          label="Email"
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          error={requestErrors.email?.message}
          {...registerRequest('email')}
        />

        <Button
          type="submit"
          variant="contained"
          size="lg"
          disabled={requestResetMutation.isPending}
          className="w-full"
        >
          {requestResetMutation.isPending ? 'Enviando...' : 'Enviar código'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        ¿Ya tienes cuenta?{' '}
        <Link to="/sign-in" className="text-primary hover:text-primary-dark font-semibold">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
