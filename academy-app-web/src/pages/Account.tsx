import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, HelpCircle, Mail, MessageCircle, ShieldCheck, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { VerificationCodeForm } from '@/components/auth/VerificationCodeForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { InlineSpinner, Spinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { cn } from '@/lib/cn';
import studioConfig from '@/lib/config/studio.config';
import { getErrorMessage } from '@/lib/errorMessages';
import { useMe } from '@/lib/queries';
import { qk } from '@/lib/queryKeys';
import {
  type ChangePasswordFormValues,
  type VerifyCodeFormValues,
  changePasswordSchema,
} from '@/lib/validations/auth';
import { getInitials } from '@/utils/general';
import { resizeImageToSquare } from '@/utils/resizeImage';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-50 bg-white p-6 shadow-sm">
      <h2 className="text-dark mb-4 text-base font-bold">{title}</h2>
      {children}
    </div>
  );
}

export default function Account() {
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
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- initialize editable form from remote profile */
  useEffect(() => {
    if (!me) return;
    setName(me.name ?? '');
    setPhone(me.phone ?? '');
    setEmail(me.email);
  }, [me]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function invalidateMe() {
    return queryClient.invalidateQueries({ queryKey: qk.me });
  }

  const profileMutation = useMutation({
    mutationFn: () => api('/api/v1/auth/me', { method: 'PATCH', body: JSON.stringify({ name, phone }) }),
    onSuccess: async () => {
      setProfileSuccess(true);
      await invalidateMe();
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: (err) => setProfileError(getErrorMessage(err, 'No se pudo guardar.')),
  });

  const emailMutation = useMutation({
    mutationFn: () => api('/api/v1/auth/me/email', { method: 'PATCH', body: JSON.stringify({ email }) }),
    onSuccess: () => setPendingEmail(email),
    onError: (err) => setEmailError(getErrorMessage(err, 'No se pudo cambiar el correo.')),
  });

  const verifyEmailMutation = useMutation({
    mutationFn: (form: VerifyCodeFormValues) =>
      api<{ token: string }>('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: pendingEmail, code: form.code }),
      }),
    onSuccess: async (data) => {
      setToken(data.token);
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
      api('/api/v1/auth/me', { method: 'PATCH', body: JSON.stringify({ notificationsEnabled: enabled }) }),
    onSuccess: () => invalidateMe(),
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setAvatarError('Solo se permiten imágenes (JPG, PNG, WEBP).');
      return;
    }

    setAvatarError(null);
    setAvatarSuccess(false);
    setUploadingAvatar(true);
    try {
      const blob = await resizeImageToSquare(file);
      const formData = new FormData();
      formData.append('file', blob, 'avatar.jpg');

      await api('/api/v1/auth/me/avatar', { method: 'POST', body: formData });
      await invalidateMe();
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err) {
      setAvatarError(getErrorMessage(err, 'No se pudo subir la foto.'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: (form: ChangePasswordFormValues) =>
      api<{ token: string }>('/api/v1/auth/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      }),
    onSuccess: (data) => {
      setToken(data.token);
      setPasswordSuccess(true);
      resetPasswordForm();
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (err) => setPasswordError(getErrorMessage(err, 'No se pudo cambiar la contraseña.')),
  });

  function onChangePassword(form: ChangePasswordFormValues) {
    setPasswordError(null);
    changePasswordMutation.mutate(form);
  }

  if (isLoading || !me) {
    return <InlineSpinner />;
  }

  if (pendingEmail) {
    return (
      <div className="max-w-md">
        <VerificationCodeForm
          title="Verifica tu nuevo correo"
          description={`Enviamos un código de 6 dígitos a ${pendingEmail}`}
          onSubmit={async (form) => {
            await verifyEmailMutation.mutateAsync(form);
          }}
          isSubmitting={verifyEmailMutation.isPending}
          submitLabel="Verificar correo"
          submittingLabel="Verificando..."
          generalError={emailError}
          onResend={handleResendEmailCode}
          resendLabel="Reenviar"
          resendHint="¿No recibiste el código?"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-dark text-3xl font-bold">Mi Cuenta</h1>

      {/* Perfil */}
      <SectionCard title="Perfil">
        <div className="mb-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="group relative h-16 w-16 shrink-0"
            title="Cambiar foto"
          >
            {me.avatarUrl ? (
              <img
                src={me.avatarUrl}
                alt={me.name ?? ''}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="bg-dark flex h-16 w-16 items-center justify-center rounded-full">
                <span className="text-lg font-bold text-white">
                  {getInitials(me.name ?? me.email)}
                </span>
              </div>
            )}
            <div
              className={cn(
                'bg-dark/50 absolute inset-0 flex items-center justify-center rounded-full text-[10px] font-semibold text-white transition-opacity',
                uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            >
              {uploadingAvatar ? <Spinner size="sm" className="border-white/40 border-t-white" /> : 'Cambiar'}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div>
            <p className="text-dark text-sm font-semibold">{me.name}</p>
            <p className="text-xs text-gray-400">{me.email}</p>
          </div>
        </div>

        {avatarError && <p className="text-danger mb-3 text-xs">{avatarError}</p>}
        {avatarSuccess && (
          <p className="text-success mb-3 flex items-center gap-1 text-xs">
            <Check className="h-3.5 w-3.5" /> Foto actualizada.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {profileError && <p className="text-danger mt-2 text-xs">{profileError}</p>}
        {profileSuccess && <p className="text-success mt-2 text-xs">Guardado.</p>}

        <div className="mt-3 flex justify-end">
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setProfileError(null);
              profileMutation.mutate();
            }}
            disabled={profileMutation.isPending}
            className="h-9 rounded-lg px-4 text-sm"
          >
            Guardar cambios
          </Button>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailError && <p className="text-danger mt-2 text-xs">{emailError}</p>}
          {email !== me.email && (
            <div className="mt-3 flex justify-end">
              <Button
                variant="outlined"
                onClick={() => {
                  setEmailError(null);
                  emailMutation.mutate();
                }}
                disabled={emailMutation.isPending}
                className="h-9 rounded-lg px-4 text-sm"
              >
                Cambiar correo (requiere verificación)
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Notificaciones */}
      <SectionCard title="Notificaciones">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
          <div>
            <p className="text-dark text-sm font-medium">Notificaciones push</p>
            <p className="text-xs text-gray-400">Pagos, cambios de clase, recordatorios</p>
          </div>
          <button
            type="button"
            onClick={() => notificationsMutation.mutate(!me.notificationsEnabled)}
            disabled={notificationsMutation.isPending}
            className={cn(
              'relative h-5 w-10 shrink-0 rounded-full transition-colors',
              me.notificationsEnabled ? 'bg-primary' : 'bg-gray-200'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                me.notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      </SectionCard>

      {/* Cambiar contraseña */}
      <SectionCard title="Cambiar contraseña">
        <form onSubmit={handlePasswordSubmit(onChangePassword)} className="flex flex-col gap-4">
          <PasswordInput
            label="Contraseña actual"
            autoComplete="current-password"
            error={passwordErrors.currentPassword?.message}
            {...registerPassword('currentPassword')}
          />
          <PasswordInput
            label="Contraseña nueva"
            autoComplete="new-password"
            error={passwordErrors.newPassword?.message}
            {...registerPassword('newPassword')}
          />
          <PasswordInput
            label="Confirmar contraseña nueva"
            autoComplete="new-password"
            error={passwordErrors.confirmPassword?.message}
            {...registerPassword('confirmPassword')}
          />

          {passwordError && <p className="text-danger text-xs">{passwordError}</p>}
          {passwordSuccess && <p className="text-success text-xs">Contraseña actualizada.</p>}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={changePasswordMutation.isPending}
              className="h-9 rounded-lg px-4 text-sm"
            >
              {changePasswordMutation.isPending ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Ayuda y soporte */}
      <SectionCard title="Ayuda y soporte">
        {studioConfig.support.email || studioConfig.support.whatsapp ? (
          <div className="flex flex-col gap-2">
            {studioConfig.support.email && (
              <a
                href={`mailto:${studioConfig.support.email}`}
                className="text-dark flex items-center gap-2 text-sm hover:text-primary"
              >
                <Mail className="h-4 w-4" /> {studioConfig.support.email}
              </a>
            )}
            {studioConfig.support.whatsapp && (
              <a
                href={`https://wa.me/${studioConfig.support.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dark flex items-center gap-2 text-sm hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <HelpCircle className="h-4 w-4" /> Contacta al administrador de tu academia.
          </p>
        )}
      </SectionCard>

      {/* Legales */}
      {(studioConfig.legal.privacyUrl || studioConfig.legal.termsUrl) && (
        <SectionCard title="Legales">
          <div className="flex flex-col gap-2">
            {studioConfig.legal.privacyUrl && (
              <a
                href={studioConfig.legal.privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dark flex items-center gap-2 text-sm hover:text-primary"
              >
                <ShieldCheck className="h-4 w-4" /> Política de Privacidad
              </a>
            )}
            {studioConfig.legal.termsUrl && (
              <a
                href={studioConfig.legal.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dark flex items-center gap-2 text-sm hover:text-primary"
              >
                <User className="h-4 w-4" /> Términos y Condiciones
              </a>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
