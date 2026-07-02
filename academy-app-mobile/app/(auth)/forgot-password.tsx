import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
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

type Step = 'request' | 'reset';

export default function ForgotPassword() {
  const { setToken } = useAuth();
  const api = useApiClient();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('request');
  const [requestedEmail, setRequestedEmail] = useState('');

  const requestForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  const requestMutation = useMutation({
    mutationFn: async (v: ForgotPasswordFormValues) => {
      await api('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: v.email }),
      });
      return v.email;
    },
    onSuccess: (email) => {
      setRequestedEmail(email);
      setStep('reset');
    },
    onError: () => setError('No pudimos enviar el código. Intenta de nuevo.'),
  });

  const resetMutation = useMutation({
    mutationFn: (v: ResetPasswordFormValues) =>
      api<{ token: string; refreshToken: string }>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: requestedEmail, code: v.code, password: v.password }),
      }),
    onSuccess: (data) => setToken(data.token, data.refreshToken),
    onError: (err) =>
      setError(getErrorMessage(err, 'No pudimos restablecer la contraseña. Intenta de nuevo.')),
  });

  if (step === 'reset') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-background">
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
          <Text className="text-[28px] font-bold text-dark">Restablece tu contraseña</Text>
          <Text className="mt-1 text-sm text-gray-400">
            Escribe el código que enviamos a {requestedEmail} y crea una nueva contraseña
          </Text>

          {error && <ErrorBanner message={error} />}

          <View className="mt-8 gap-5">
            <Controller
              control={resetForm.control}
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
                  error={resetForm.formState.errors.code?.message}
                />
              )}
            />
            <Controller
              control={resetForm.control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  label="Nueva contraseña"
                  placeholder="Al menos 8 caracteres"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={resetForm.formState.errors.password?.message}
                />
              )}
            />
            <Controller
              control={resetForm.control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  label="Confirmar contraseña"
                  placeholder="Repite la contraseña"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={resetForm.formState.errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              label={resetMutation.isPending ? 'Actualizando...' : 'Actualizar contraseña'}
              loading={resetMutation.isPending}
              onPress={resetForm.handleSubmit((v) => { setError(null); resetMutation.mutate(v); })}
              size="lg"
              className="w-full"
            />

            <View className="items-center gap-3">
              <Pressable onPress={async () => {
                setError(null);
                try {
                  await api('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: requestedEmail }) });
                } catch {
                  setError('No se pudo reenviar el código.');
                }
              }}>
                <Text className="text-sm font-semibold text-primary">Reenviar código</Text>
              </Pressable>
              <Pressable onPress={() => { setStep('request'); setError(null); }}>
                <Text className="text-sm text-gray-400">Usar otro correo</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <Text className="text-[28px] font-bold text-dark">¿Olvidaste tu contraseña?</Text>
        <Text className="mt-1 text-sm text-gray-400">
          Te enviaremos un código para que puedas restablecerla
        </Text>

        {error && <ErrorBanner message={error} />}

        <View className="mt-8 gap-5">
          <Controller
            control={requestForm.control}
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
                error={requestForm.formState.errors.email?.message}
              />
            )}
          />

          <Button
            label={requestMutation.isPending ? 'Enviando...' : 'Enviar código'}
            loading={requestMutation.isPending}
            onPress={requestForm.handleSubmit((v) => { setError(null); requestMutation.mutate(v); })}
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
