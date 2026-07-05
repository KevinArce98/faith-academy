import { Image, Text, View } from 'react-native';
import { getInitials } from '@/utils/general';
import { cn } from '@/utils/cn';

type AvatarProps = {
  name: string;
  uri?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: { container: 'h-8 w-8', text: 'text-xs' },
  md: { container: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-12 w-12', text: 'text-base' },
};

export function Avatar({ name, uri, size = 'md', className }: AvatarProps) {
  const s = sizeMap[size];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        className={cn('rounded-full shrink-0', s.container, className)}
      />
    );
  }

  return (
    <View
      className={cn(
        'rounded-full bg-dark items-center justify-center shrink-0',
        s.container,
        className,
      )}
    >
      <Text className={cn('font-bold text-white', s.text)}>{getInitials(name)}</Text>
    </View>
  );
}
