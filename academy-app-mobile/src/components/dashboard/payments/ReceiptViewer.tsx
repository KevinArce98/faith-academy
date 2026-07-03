import { Ionicons } from '@expo/vector-icons';
import { Image, Linking, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

function isImageUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  return !!ext && IMAGE_EXTS.has(ext);
}

type ReceiptViewerProps = {
  url: string | null;
  onClose: () => void;
};

export function ReceiptViewer({ url, onClose }: ReceiptViewerProps) {
  const isImage = url ? isImageUrl(url) : false;

  return (
    <Modal
      visible={!!url}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <View className="flex-1 bg-black/95">
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View className="flex-row items-center justify-between px-4 py-3">
              <Text className="text-base font-semibold text-white">Comprobante</Text>
              <Pressable onPress={onClose} hitSlop={8} className="p-1">
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>

            <View className="flex-1 items-center justify-center px-4">
              {url && isImage ? (
                <Image source={{ uri: url }} className="h-full w-full" resizeMode="contain" />
              ) : (
                <View className="items-center gap-3">
                  <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.7)" />
                  <Text className="text-center text-sm text-white/70">
                    Este comprobante es un PDF y no se puede previsualizar aquí.
                  </Text>
                  <Pressable
                    onPress={() => url && Linking.openURL(url)}
                    className="rounded-xl bg-white/10 px-4 py-2.5"
                  >
                    <Text className="text-sm font-semibold text-white">Abrir archivo</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
