import { Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, greeting } from '@/utils/general';

type Props = { name: string };

export function DashboardHeader({ name }: Props) {
  const firstName = name.split(' ')[0];
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <Text className="text-[13px] font-medium capitalize text-text-muted">{formatDate(new Date())}</Text>
        <Text className="mt-0.5 text-2xl font-bold text-dark" numberOfLines={1}>
          {greeting()}, {firstName} 👋
        </Text>
      </View>
      <Avatar name={name} size="md" />
    </View>
  );
}
