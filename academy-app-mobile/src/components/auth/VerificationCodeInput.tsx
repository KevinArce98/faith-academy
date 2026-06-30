import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { type VerifyCodeFormValues, verifyCodeSchema } from '@/lib/validations/auth';

type Props = {
  title: string;
  description: string;
  onSubmit: (values: VerifyCodeFormValues) => void;
  isSubmitting: boolean;
  submitLabel?: string;
  generalError?: string | null;
  onResend?: () => void;
  resendLabel?: string;
  resendHint?: string;
};

export function VerificationCodeInput({
  title,
  description,
  onSubmit,
  isSubmitting,
  submitLabel = 'Verificar',
  generalError,
  onResend,
  resendLabel = 'Reenviar',
  resendHint = '¿No recibiste el código?',
}: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '' },
  });

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text className="text-2xl font-bold text-dark">{title}</Text>
        <Text className="text-sm text-gray-400">{description}</Text>
      </View>

      {generalError && <ErrorBanner message={generalError} />}

      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Código de verificación"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.code?.message}
          />
        )}
      />

      <Button
        label={submitLabel}
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
        size="lg"
        className="w-full"
      />

      {onResend && (
        <View className="items-center gap-1">
          <Text className="text-sm text-gray-400">{resendHint}</Text>
          <Pressable onPress={onResend}>
            <Text className="text-sm font-semibold text-primary">{resendLabel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
