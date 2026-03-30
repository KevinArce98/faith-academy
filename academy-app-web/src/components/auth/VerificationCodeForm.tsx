import { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  verifyCodeSchema,
  type VerifyCodeFormValues,
} from '@/lib/validations/auth';

interface VerificationCodeFormProps {
  title: string;
  description: string;
  onSubmit: (values: VerifyCodeFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  generalError?: string | null;
  onResend?: () => Promise<void> | void;
  resendLabel?: string;
  resendHint?: string;
  secondaryActions?: ReactNode;
  inputLabel?: string;
  placeholder?: string;
}

export function VerificationCodeForm({
  title,
  description,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Verificar',
  submittingLabel = 'Verificando...',
  generalError,
  onResend,
  resendLabel = 'Reenviar código',
  resendHint,
  secondaryActions,
  inputLabel = 'Código de verificación',
  placeholder = '000000',
}: VerificationCodeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '' },
  });

  async function handleFormSubmit(values: VerifyCodeFormValues) {
    await onSubmit(values);
  }

  return (
    <>
      <h2 className="text-dark text-[28px] font-bold leading-tight">{title}</h2>
      <p className="mt-2 text-sm text-gray-400">{description}</p>

      {generalError && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {generalError}
        </p>
      )}

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="mt-8 flex flex-col gap-5"
      >
        <Input
          label={inputLabel}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={placeholder}
          className="tracking-widest"
          error={errors.code?.message}
          {...register('code')}
        />

        <Button
          type="submit"
          variant="contained"
          size="lg"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
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
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>

      {(onResend || secondaryActions) && (
        <div className="mt-4 flex flex-col gap-2 text-center">
          {resendHint && (
            <p className="text-sm text-gray-400">{resendHint}</p>
          )}

          {onResend && (
            <Button
              variant="text"
              color="primary"
              onClick={onResend}
              disabled={isSubmitting}
              className="h-auto p-0 text-sm font-medium hover:bg-transparent"
            >
              {resendLabel}
            </Button>
          )}

          {secondaryActions}
        </div>
      )}
    </>
  );
}
