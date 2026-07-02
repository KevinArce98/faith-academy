import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { theme } from '@/theme';

type TempPasswordResultProps = {
  title: string;
  subtitle: string;
  tempPassword: string;
  onClose: () => void;
};

/**
 * Pantalla de éxito compartida tras crear un usuario gestionado (alumno o
 * profesor): muestra la contraseña temporal seleccionable para copiar.
 */
export function TempPasswordResult({
  title,
  subtitle,
  tempPassword,
  onClose,
}: TempPasswordResultProps) {
  return (
    <View className="items-center gap-4 px-6 pb-8 pt-2">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <Ionicons name="checkmark" size={34} color={theme.colors.success} />
      </View>
      <View className="items-center">
        <Text className="text-xl font-bold text-dark">{title}</Text>
        <Text className="text-center text-sm text-gray-500">{subtitle}</Text>
      </View>

      <View className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Text className="text-sm font-semibold text-amber-800">Contraseña temporal</Text>
        <View className="mt-2 rounded-xl border border-amber-200 bg-white px-4 py-3">
          <Text
            selectable
            className="text-center font-mono text-lg font-semibold tracking-wide text-dark"
          >
            {tempPassword}
          </Text>
        </View>
        <Text className="mt-2 text-xs text-amber-700">
          Mantén presionado para copiar. Pídele cambiarla al iniciar sesión por primera vez.
        </Text>
      </View>

      <Button label="Cerrar" className="w-full" onPress={onClose} />
    </View>
  );
}
