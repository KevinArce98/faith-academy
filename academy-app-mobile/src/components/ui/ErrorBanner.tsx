import { Text, View } from 'react-native';

type ErrorBannerProps = { message: string };

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3">
      <Text className="text-sm font-medium text-danger">{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <View className="rounded-xl border border-success/20 bg-success/10 px-4 py-3">
      <Text className="text-sm font-medium text-success">{message}</Text>
    </View>
  );
}
