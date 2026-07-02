import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';

// El modal se monta sobre la barra de tabs, por eso basta un padding inferior fijo.
const BOTTOM_PAD = 16;

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Render content directly without the scrolling form padding (e.g. result states). */
  bare?: boolean;
};

export function Sheet({ visible, onClose, title, children, bare }: SheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

        <View className="max-h-[85%] rounded-t-3xl bg-surface">
          <View className="items-center pt-3 pb-1">
            <View className="h-1 w-10 rounded-full bg-gray-300" />
          </View>

          {title != null && (
            <View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-4">
              <Text className="text-lg font-bold text-dark">{title}</Text>
              <Pressable onPress={onClose} hitSlop={8} className="p-1">
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          )}

          {bare ? (
            <View style={{ paddingBottom: BOTTOM_PAD }}>{children}</View>
          ) : (
            <ScrollView
              contentContainerClassName={cn('px-6 pt-6 gap-5')}
              contentContainerStyle={{ paddingBottom: BOTTOM_PAD }}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              {children}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
