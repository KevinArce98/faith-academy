import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth/useAuth';
import { InlineSpinner } from '@/components/ui/Spinner';
import { theme } from '@/theme';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <InlineSpinner />;
  if (isSignedIn) return <Redirect href="/(app)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
