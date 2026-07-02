import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { theme } from '@/theme';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Ionicons name="help-circle-outline" size={56} color={theme.colors.textMuted} className="mb-4" />
        <Text className="text-xl font-bold text-dark mb-2">Pantalla no encontrada</Text>
        <Link href="/" className="mt-4 text-primary font-semibold">
          Volver al inicio
        </Link>
      </View>
    </>
  );
}
