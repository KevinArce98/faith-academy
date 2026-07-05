import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { cn } from '@/utils/cn';

type CheckboxProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  className?: string;
};

export function Checkbox({ value, onValueChange, className }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      className={cn(
        'h-5 w-5 items-center justify-center rounded-md border',
        value ? 'bg-primary border-primary' : 'border-gray-300 bg-white',
        className,
      )}
    >
      {value && <Ionicons name="checkmark" size={14} color="#fff" />}
    </Pressable>
  );
}
