import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';
import { cn } from '@/utils/cn';

type PasswordInputProps = TextInputProps & {
  label?: string;
  error?: string;
  className?: string;
};

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  ({ label, error, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <View className="gap-1.5">
        {label && <Text className="text-sm font-medium text-dark">{label}</Text>}
        <View className="relative">
          <TextInput
            ref={ref}
            secureTextEntry={!visible}
            className={cn(
              'h-12 rounded-xl border border-gray-200 bg-white px-4 pr-12 text-base text-dark',
              'focus:border-primary',
              error && 'border-danger',
              className,
            )}
            placeholderTextColor="#9CA3AF"
            {...props}
          />
          <Pressable
            onPress={() => setVisible((v) => !v)}
            className="absolute right-4 top-0 bottom-0 justify-center"
          >
            <Text className="text-sm font-medium text-gray-400">
              {visible ? 'Ocultar' : 'Ver'}
            </Text>
          </Pressable>
        </View>
        {error && <Text className="text-xs text-danger">{error}</Text>}
      </View>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
