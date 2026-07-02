import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';

export type SelectOption = { value: string; label: string };

type SelectProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
};

export function Select({
  label,
  placeholder = 'Seleccionar',
  value,
  onChange,
  options,
  error,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="gap-1.5">
      {label && <Text className="text-sm font-medium text-dark">{label}</Text>}

      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          'h-12 flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-4',
          error && 'border-danger',
        )}
      >
        <Text className={cn('text-base', selected ? 'text-dark' : 'text-gray-400')}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
      </Pressable>

      {error && <Text className="text-xs text-danger">{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 justify-center bg-black/40 px-6"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="max-h-[70%] overflow-hidden rounded-2xl bg-surface"
            onPress={(e) => e.stopPropagation()}
          >
            {label && (
              <View className="border-b border-gray-100 px-5 py-4">
                <Text className="text-base font-bold text-dark">{label}</Text>
              </View>
            )}
            <ScrollView>
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex-row items-center justify-between px-5 py-3.5',
                      active && 'bg-primary/5',
                    )}
                  >
                    <Text className={cn('text-base', active ? 'text-primary font-semibold' : 'text-dark')}>
                      {opt.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
