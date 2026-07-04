import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { apiUrl, MOBILE_HEADERS, refreshAccessToken, useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { getErrorMessage } from '@/lib/errorMessages';
import { qk } from '@/lib/queryKeys';
import { theme } from '@/theme';
import { formatPrice } from '@/utils/general';

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

type EnrollmentUploadSheetProps = {
  visible: boolean;
  onClose: () => void;
  fee: number;
};

/**
 * Subida de comprobante de matrícula — versión simplificada de
 * UploadPaymentSheet sin selector de plan (el monto es fijo, el enrollmentFee
 * del alumno) ni reserva de clase suelta.
 */
export function EnrollmentUploadSheet({ visible, onClose, fee }: EnrollmentUploadSheetProps) {
  const api = useApiClient();
  const { getToken, setToken } = useAuth();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
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
      await api('/api/v1/payments/enrollment', {
        method: 'POST',
        body: JSON.stringify({ receiptKey: key }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.payments });
      queryClient.invalidateQueries({ queryKey: qk.enrollmentStatus() });
      handleClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'No se pudo enviar el comprobante.')),
  });

  function handleSubmit() {
    setError(null);
    if (!file) {
      setError('Adjunta el comprobante de pago.');
      return;
    }
    submitMutation.mutate();
  }

  return (
    <Sheet visible={visible} onClose={handleClose} title="Pagar mi matrícula">
      <View className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-500">Monto de matrícula</Text>
          <Text className="text-base font-bold text-primary">{formatPrice(fee)}</Text>
        </View>
      </View>

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
