import { Pressable, View } from 'react-native';
import { cn } from '@/utils/cn';

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function Switch({ value, onValueChange }: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      className={cn('h-6 w-11 justify-center rounded-full px-0.5', value ? 'bg-primary' : 'bg-gray-200')}
    >
      <View
        className={cn(
          'h-5 w-5 rounded-full bg-white shadow',
          value ? 'self-end' : 'self-start',
        )}
      />
    </Pressable>
  );
}
