import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner, SuccessBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { InlineSpinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { getErrorMessage } from '@/lib/errorMessages';
import type { VerifyCodeFormValues } from '@/lib/validations/auth';
import { useMe } from '@/lib/queries';
import { qk } from '@/lib/queryKeys';
import { theme } from '@/theme';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3">
      <Text className="text-base font-bold text-dark">{title}</Text>
      {children}
    </Card>
  );
}

export default function AccountScreen() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { setToken } = useAuth();
  const { data: me, isLoading } = useMe();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? '');
    setPhone(me.phone ?? '');
    setEmail(me.email);
  }, [me]);

  function invalidateMe() {
    return queryClient.invalidateQueries({ queryKey: qk.me });
  }

  const profileMutation = useMutation({
    mutationFn: () =>
      api('/api/v1/auth/me', { method: 'PATCH', body: JSON.stringify({ name, phone }) }),
    onSuccess: async () => {
      setProfileSuccess(true);
      await invalidateMe();
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: (err) => setProfileError(getErrorMessage(err, 'No se pudo guardar.')),
  });

  const emailMutation = useMutation({
    mutationFn: () =>
      api('/api/v1/auth/me/email', { method: 'PATCH', body: JSON.stringify({ email }) }),
    onSuccess: () => setPendingEmail(email),
    onError: (err) => setEmailError(getErrorMessage(err, 'No se pudo cambiar el correo.')),
  });

  const verifyEmailMutation = useMutation({
    mutationFn: (form: VerifyCodeFormValues) =>
      api<{ token: string; refreshToken: string }>('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: pendingEmail, code: form.code }),
      }),
    onSuccess: async (data) => {
      setToken(data.token, data.refreshToken);
      setPendingEmail(null);
      await invalidateMe();
    },
    onError: (err) => setEmailError(getErrorMessage(err, 'Código inválido o expirado.')),
  });

  async function handleResendEmailCode() {
    if (!pendingEmail) return;
    try {
      await api('/api/v1/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: pendingEmail }),
      });
    } catch {
      setEmailError('No se pudo reenviar el código.');
    }
  }

  const notificationsMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      api('/api/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ notificationsEnabled: enabled }),
      }),
    onSuccess: () => invalidateMe(),
  });

  async function handlePickAvatar() {
    setAvatarError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setAvatarError('Necesitamos permiso para acceder a tus fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const side = Math.min(asset.width, asset.height);
      const originX = (asset.width - side) / 2;
      const originY = (asset.height - side) / 2;

      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [
          { crop: { originX, originY, width: side, height: side } },
          { resize: { width: 512, height: 512 } },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      const { uploadUrl, publicUrl } = await api<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
      }>('/api/v1/auth/me/avatar-upload-url', { method: 'POST', body: JSON.stringify({ ext: 'jpg' }) });

      const res = await FileSystem.uploadAsync(uploadUrl, manipulated.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': 'image/jpeg' },
      });
      if (res.status < 200 || res.status >= 300) {
        throw new Error('No se pudo subir la imagen.');
      }

      await api('/api/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });
      await invalidateMe();
    } catch (err) {
      setAvatarError(getErrorMessage(err, 'No se pudo subir la foto.'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      api<{ token: string; refreshToken: string }>('/api/v1/auth/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: (data) => {
      setToken(data.token, data.refreshToken);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (err) => setPasswordError(getErrorMessage(err, 'No se pudo cambiar la contraseña.')),
  });

  function handleChangePassword() {
    setPasswordError(null);
    if (!currentPassword || !newPassword) {
      setPasswordError('Completa todos los campos.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    changePasswordMutation.mutate();
  }

  if (isLoading || !me) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <InlineSpinner />
      </SafeAreaView>
    );
  }

  if (pendingEmail) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="px-6 py-12">
          <VerificationCodeInput
            title="Verifica tu nuevo correo"
            description={`Enviamos un código de 6 dígitos a ${pendingEmail}`}
            onSubmit={(v) => verifyEmailMutation.mutateAsync(v)}
            isSubmitting={verifyEmailMutation.isPending}
            submitLabel="Verificar correo"
            generalError={emailError}
            onResend={handleResendEmailCode}
            resendLabel="Reenviar código"
            resendHint="¿No recibiste el código?"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-4">
        <Text className="text-2xl font-bold text-dark">Mi Cuenta</Text>

        <SectionCard title="Perfil">
          <View className="flex-row items-center gap-4">
            <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
              <Avatar name={me.name ?? me.email} uri={me.avatarUrl} size="lg" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-dark">{me.name}</Text>
              <Text className="text-xs text-gray-400">{me.email}</Text>
              <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
                <Text className="mt-1 text-xs font-semibold text-primary">
                  {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
                </Text>
              </Pressable>
            </View>
          </View>

          {avatarError && <Text className="text-xs text-danger">{avatarError}</Text>}

          <Input label="Nombre" value={name} onChangeText={setName} />
          <Input label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          {profileError && <ErrorBanner message={profileError} />}
          {profileSuccess && <SuccessBanner message="Guardado." />}

          <Button
            label="Guardar cambios"
            loading={profileMutation.isPending}
            onPress={() => {
              setProfileError(null);
              profileMutation.mutate();
            }}
          />

          <View className="mt-2 gap-2 border-t border-gray-100 pt-3">
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {emailError && <ErrorBanner message={emailError} />}
            {email !== me.email && (
              <Button
                label="Cambiar correo (requiere verificación)"
                variant="outlined"
                loading={emailMutation.isPending}
                onPress={() => {
                  setEmailError(null);
                  emailMutation.mutate();
                }}
              />
            )}
          </View>
        </SectionCard>

        <SectionCard title="Notificaciones">
          <View className="flex-row items-center justify-between rounded-xl bg-gray-50 p-3">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-medium text-dark">Notificaciones push</Text>
              <Text className="text-xs text-gray-400">Pagos, cambios de clase, recordatorios</Text>
            </View>
            <Switch
              value={me.notificationsEnabled}
              onValueChange={(v) => notificationsMutation.mutate(v)}
            />
          </View>
        </SectionCard>

        <SectionCard title="Cambiar contraseña">
          <PasswordInput
            label="Contraseña actual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <PasswordInput label="Contraseña nueva" value={newPassword} onChangeText={setNewPassword} />
          <PasswordInput
            label="Confirmar contraseña nueva"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {passwordError && <ErrorBanner message={passwordError} />}
          {passwordSuccess && <SuccessBanner message="Contraseña actualizada." />}
          <Button
            label="Cambiar contraseña"
            loading={changePasswordMutation.isPending}
            onPress={handleChangePassword}
          />
        </SectionCard>

        <SectionCard title="Ayuda y soporte">
          {theme.support.email || theme.support.whatsapp ? (
            <View className="gap-2">
              {theme.support.email && (
                <Pressable onPress={() => Linking.openURL(`mailto:${theme.support.email}`)}>
                  <Text className="text-sm text-dark">{theme.support.email}</Text>
                </Pressable>
              )}
              {theme.support.whatsapp && (
                <Pressable
                  onPress={() => Linking.openURL(`https://wa.me/${theme.support.whatsapp}`)}
                >
                  <Text className="text-sm text-dark">WhatsApp</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Text className="text-sm text-gray-400">Contacta al administrador de tu academia.</Text>
          )}
        </SectionCard>

        {(theme.legal.privacyUrl || theme.legal.termsUrl) && (
          <SectionCard title="Legales">
            <View className="gap-2">
              {theme.legal.privacyUrl && (
                <Pressable onPress={() => Linking.openURL(theme.legal.privacyUrl!)}>
                  <Text className="text-sm text-dark">Política de Privacidad</Text>
                </Pressable>
              )}
              {theme.legal.termsUrl && (
                <Pressable onPress={() => Linking.openURL(theme.legal.termsUrl!)}>
                  <Text className="text-sm text-dark">Términos y Condiciones</Text>
                </Pressable>
              )}
            </View>
          </SectionCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
