import { forwardRef } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  className?: string;
};

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <View className="gap-1.5">
        {label && (
          <Text className="text-sm font-medium text-dark">{label}</Text>
        )}
        <TextInput
          ref={ref}
          className={cn(
            'h-12 rounded-xl border border-gray-200 bg-white px-4 text-base text-dark',
            'focus:border-primary leading-5',
            error && 'border-danger',
            className,
          )}
          placeholderTextColor={theme.colors.placeholder}
          {...props}
        />
        {error && <Text className="text-xs text-danger">{error}</Text>}
      </View>
    );
  },
);

Input.displayName = 'Input';
