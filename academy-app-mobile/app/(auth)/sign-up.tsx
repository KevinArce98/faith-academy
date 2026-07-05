import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { getErrorMessage } from '@/lib/errorMessages';
import { type SignUpFormValues, type VerifyCodeFormValues, signUpSchema } from '@/lib/validations/auth';
import { theme } from '@/theme';

function openLegalUrl(url: string | null) {
  if (!url) return;
  Linking.openURL(url);
}

export default function SignUp() {
  const { verifyEmail } = useLocalSearchParams<{ verifyEmail?: string }>();
  const { setToken } = useAuth();
  const api = useApiClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(verifyEmail ?? null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', termsAccepted: false },
  });

  const signUpMutation = useMutation({
    mutationFn: async (form: SignUpFormValues) => {
      await api('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          termsAccepted: form.termsAccepted,
        }),
      });
      return form.email;
    },
    onSuccess: (email) => setPendingEmail(email),
    onError: (err) => setError(getErrorMessage(err, 'Error al crear la cuenta. Intenta de nuevo.')),
  });

  const verifyMutation = useMutation({
    mutationFn: (form: VerifyCodeFormValues) =>
      api<{ token: string; refreshToken: string }>('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: pendingEmail, code: form.code }),
      }),
    onSuccess: (data) => {
      setToken(data.token, data.refreshToken);
    },
    onError: (err) => setError(getErrorMessage(err, 'Código inválido o expirado.')),
  });

  async function handleResendCode() {
    if (!pendingEmail) return;
    setError(null);
    try {
      await api('/api/v1/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: pendingEmail }),
      });
    } catch {
      setError('No se pudo reenviar el código. Intenta de nuevo.');
    }
  }

  if (pendingEmail) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-background">
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
          <VerificationCodeInput
            title="Verifica tu correo"
            description={`Enviamos un código de 6 dígitos a ${pendingEmail}`}
            onSubmit={(v) => { setError(null); verifyMutation.mutate(v); }}
            isSubmitting={verifyMutation.isPending}
            submitLabel="Verificar cuenta"
            generalError={error}
            onResend={handleResendCode}
            resendLabel="Reenviar código"
            resendHint="¿No recibiste el código?"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <View className="mb-10 items-center gap-2">
          <View className="h-16 w-16 rounded-2xl bg-primary items-center justify-center">
            <Text className="text-2xl font-bold text-white">{theme.studio.logoText}</Text>
          </View>
          <Text className="text-xl font-bold text-dark">{theme.studio.name}</Text>
        </View>

        <Text className="text-[28px] font-bold text-dark">Crea tu cuenta</Text>
        <Text className="mt-1 text-sm text-gray-400">Ingresa tus datos para comenzar</Text>

        {error && <ErrorBanner message={error} />}

        <View className="mt-8 gap-5">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nombre completo"
                placeholder="Juan Pérez"
                autoComplete="name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordInput
                label="Contraseña"
                placeholder="Al menos 8 caracteres"
                autoComplete="new-password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="termsAccepted"
            render={({ field: { onChange, value } }) => (
              <View className="gap-1">
                <Pressable
                  onPress={() => onChange(!value)}
                  className="flex-row items-start gap-2"
                >
                  <Checkbox value={value} onValueChange={onChange} className="mt-0.5" />
                  <Text className="flex-1 text-sm text-gray-500">
                    Acepto los{' '}
                    <Text
                      className="text-primary font-medium"
                      onPress={() => openLegalUrl(theme.legal.termsUrl)}
                    >
                      Términos y Condiciones
                    </Text>{' '}
                    y la{' '}
                    <Text
                      className="text-primary font-medium"
                      onPress={() => openLegalUrl(theme.legal.privacyUrl)}
                    >
                      Política de Privacidad
                    </Text>
                  </Text>
                </Pressable>
                {errors.termsAccepted?.message && (
                  <Text className="text-xs text-danger">{errors.termsAccepted.message}</Text>
                )}
              </View>
            )}
          />

          <Button
            label={signUpMutation.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
            loading={signUpMutation.isPending}
            onPress={handleSubmit((v) => { setError(null); signUpMutation.mutate(v); })}
            size="lg"
            className="w-full"
          />
        </View>

        <View className="mt-8 flex-row justify-center gap-1">
          <Text className="text-sm text-gray-400">¿Ya tienes cuenta?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-primary">Inicia sesión</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
