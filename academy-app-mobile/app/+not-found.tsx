import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-4xl mb-4">🔍</Text>
        <Text className="text-xl font-bold text-dark mb-2">Pantalla no encontrada</Text>
        <Link href="/" className="mt-4 text-primary font-semibold">
          Volver al inicio
        </Link>
      </View>
    </>
  );
}
