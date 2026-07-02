import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { LEVEL_LABELS } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { apiUrl, MOBILE_HEADERS, refreshAccessToken, useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { getErrorMessage } from '@/lib/errorMessages';
import { usePlans } from '@/lib/queries';
import { qk } from '@/lib/queryKeys';
import { theme } from '@/theme';
import { formatPrice } from '@/utils/general';

import { upcomingSessions, type ClassOption } from './sessions';

type PickedFile = { uri: string; name: string; mimeType: string; ext: string };

const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);

function fileFromAsset(asset: ImagePicker.ImagePickerAsset): PickedFile {
  const fromName = asset.fileName?.split('.').pop()?.toLowerCase();
  const fromMime = asset.mimeType?.split('/').pop()?.toLowerCase();
  const ext = [fromName, fromMime].find((e) => e && ALLOWED_EXTS.has(e)) ?? 'jpg';
  return {
    uri: asset.uri,
    name: `comprobante.${ext}`,
    mimeType: asset.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    ext,
  };
}

function parseError(body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed?.error === 'string') return parsed.error;
  } catch {
    // body no es JSON
  }
  return null;
}

type UploadPaymentSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function UploadPaymentSheet({ visible, onClose }: UploadPaymentSheetProps) {
  const api = useApiClient();
  const { getToken, setToken } = useAuth();
  const queryClient = useQueryClient();

  const [planId, setPlanId] = useState('');
  const [bookingClassId, setBookingClassId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: plansData } = usePlans(visible);
  const plans = (plansData ?? []).filter((p) => p.isActive);
  const selectedPlan = plans.find((p) => p.id === planId);
  const isSingleClass = selectedPlan?.isSingleClass ?? false;

  const { data: classesData } = useQuery<{ classes: ClassOption[] }>({
    queryKey: qk.classes,
    queryFn: () => api<{ classes: ClassOption[] }>('/api/v1/classes'),
    enabled: visible && isSingleClass,
  });
  const classes = (classesData?.classes ?? []).filter((c) => !c.isPrivate);
  const bookingClass = classes.find((c) => c.id === bookingClassId);
  const sessionOptions = bookingClass ? upcomingSessions(bookingClass) : [];

  function reset() {
    setPlanId('');
    setBookingClassId('');
    setBookingDate('');
    setFile(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function pickImage() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Necesitamos permiso para acceder a tus fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setFile(fileFromAsset(result.assets[0]));
  }

  // El fetch de Expo no soporta partes { uri } en FormData; se sube con
  // FileSystem.uploadAsync (multipart real). Copiamos a una extensión válida
  // para que el backend derive bien el tipo desde el nombre del archivo.
  async function uploadReceipt(picked: PickedFile): Promise<string> {
    const dest = `${FileSystem.cacheDirectory}receipt_${Date.now()}.${picked.ext}`;
    await FileSystem.copyAsync({ from: picked.uri, to: dest });

    const send = (token: string | null) =>
      FileSystem.uploadAsync(apiUrl('/api/v1/payments/upload'), dest, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: picked.mimeType,
        headers: {
          ...MOBILE_HEADERS,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

    let res = await send(getToken());
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        setToken(refreshed.token, refreshed.refreshToken);
        res = await send(refreshed.token);
      }
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(parseError(res.body) ?? 'No se pudo subir el comprobante.');
    }
    const { key } = JSON.parse(res.body) as { key: string };
    return key;
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const key = await uploadReceipt(file as PickedFile);
      await api('/api/v1/payments/orders', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          receiptKey: key,
          ...(isSingleClass ? { bookingClassId, bookingDate } : {}),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.payments });
      handleClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'No se pudo enviar el comprobante.')),
  });

  function handleSubmit() {
    setError(null);
    if (!planId) {
      setError('Selecciona un plan.');
      return;
    }
    if (!file) {
      setError('Adjunta el comprobante de pago.');
      return;
    }
    if (isSingleClass && (!bookingClassId || !bookingDate)) {
      setError('Elige la clase y la fecha de la sesión.');
      return;
    }
    submitMutation.mutate();
  }

  function changeClass(id: string) {
    setBookingClassId(id);
    setBookingDate('');
  }

  return (
    <Sheet visible={visible} onClose={handleClose} title="Subir comprobante">
      <Select
        label="Plan"
        placeholder="Selecciona un plan"
        value={planId}
        onChange={(id) => {
          setPlanId(id);
          setBookingClassId('');
          setBookingDate('');
        }}
        options={plans.map((p) => ({
          value: p.id,
          label: `${p.name} — ${formatPrice(p.price)}`,
        }))}
      />

      {isSingleClass && (
        <>
          <Select
            label="Clase"
            placeholder="Selecciona la clase"
            value={bookingClassId}
            onChange={changeClass}
            options={classes.map((c) => ({
              value: c.id,
              label: `${c.name} · ${LEVEL_LABELS[c.skillLevel] ?? c.skillLevel}`,
            }))}
          />
          {bookingClass && (
            <Select
              label="Fecha de la sesión"
              placeholder="Selecciona la fecha"
              value={bookingDate}
              onChange={setBookingDate}
              options={sessionOptions.map((s) => ({ value: s.date, label: s.label }))}
            />
          )}
        </>
      )}

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-dark">Comprobante de pago</Text>
        <Pressable
          onPress={pickImage}
          className="items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6"
        >
          {file ? (
            <>
              <Image
                source={{ uri: file.uri }}
                className="h-40 w-full rounded-lg"
                resizeMode="contain"
              />
              <Text className="text-xs font-medium text-primary">Cambiar archivo</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={30} color={theme.colors.textMuted} />
              <Text className="text-sm font-medium text-gray-600">Toca para elegir una foto</Text>
              <Text className="text-xs text-gray-400">JPG, PNG o WEBP</Text>
            </>
          )}
        </Pressable>
      </View>

      {selectedPlan && (
        <View className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-500">Total a pagar</Text>
            <Text className="text-base font-bold text-primary">
              {formatPrice(selectedPlan.price)}
            </Text>
          </View>
        </View>
      )}

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button
        label={submitMutation.isPending ? 'Enviando...' : 'Enviar comprobante'}
        className="w-full"
        loading={submitMutation.isPending}
        onPress={handleSubmit}
      />
    </Sheet>
  );
}
