import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
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
import { type SignInFormValues, signInSchema } from '@/lib/validations/auth';
import { theme } from '@/theme';

export default function SignIn() {
  const router = useRouter();
  const { setToken } = useAuth();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: (form: SignInFormValues) =>
      api<{ token: string; refreshToken: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      }),
    onSuccess: (data) => {
      queryClient.clear();
      setToken(data.token, data.refreshToken);
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'EMAIL_NOT_VERIFIED') {
        router.push({ pathname: '/(auth)/sign-up', params: { verifyEmail: getValues('email') } });
      } else {
        setError(getErrorMessage(err, 'Error al iniciar sesión. Intenta de nuevo.'));
      }
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / nombre */}
        <View className="mb-10 items-center gap-2">
          <View className="h-16 w-16 rounded-2xl bg-primary items-center justify-center">
            <Text className="text-2xl font-bold text-white">{theme.studio.logoText}</Text>
          </View>
          <Text className="text-xl font-bold text-dark">{theme.studio.name}</Text>
        </View>

        <Text className="text-[28px] font-bold text-dark">Bienvenido de nuevo</Text>
        <Text className="mt-1 text-sm text-gray-400">Ingresa tus credenciales para continuar</Text>

        {error && <ErrorBanner message={error} />}

        <View className="mt-8 gap-5">
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
                placeholder="Tu contraseña"
                autoComplete="current-password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable className="self-end">
              <Text className="text-sm font-medium text-primary">¿Olvidaste tu contraseña?</Text>
            </Pressable>
          </Link>

          <Button
            label={loginMutation.isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            loading={loginMutation.isPending}
            onPress={handleSubmit((v) => {
              setError(null);
              loginMutation.mutate(v);
            })}
            size="lg"
            className="w-full"
          />
        </View>

        <View className="mt-8 flex-row justify-center gap-1">
          <Text className="text-sm text-gray-400">¿No tienes cuenta?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-primary">Regístrate</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
