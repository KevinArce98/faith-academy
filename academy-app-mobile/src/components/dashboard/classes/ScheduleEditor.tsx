import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';
import { DAY_OPTIONS, TIME_OPTIONS, type Slot } from './classes.types';

type ScheduleEditorProps = {
  value: Slot[];
  onChange: (slots: Slot[]) => void;
};

export function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  function addSlot() {
    onChange([...value, { dayOfWeek: 1, startTime: '17:00', endTime: '18:00' }]);
  }

  function updateSlot(index: number, patch: Partial<Slot>) {
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSlot(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-dark">Horario semanal</Text>

      {value.length === 0 && (
        <Text className="text-xs text-gray-400">
          Agrega uno o más días con su horario de inicio y fin.
        </Text>
      )}

      {value.map((slot, index) => (
        <View key={index} className="gap-2 rounded-xl border border-gray-100 bg-white p-3">
          <View className="flex-row flex-wrap gap-1.5">
            {DAY_OPTIONS.map((day) => {
              const active = slot.dayOfWeek === day.value;
              return (
                <Pressable
                  key={day.value}
                  onPress={() => updateSlot(index, { dayOfWeek: day.value })}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5',
                    active ? 'border-primary bg-primary' : 'border-gray-200 bg-white',
                  )}
                >
                  <Text className={cn('text-xs font-semibold', active ? 'text-white' : 'text-gray-500')}>
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <Select
                value={slot.startTime}
                onChange={(startTime) => updateSlot(index, { startTime })}
                options={TIME_OPTIONS}
              />
            </View>
            <Text className="pb-3 text-gray-400">–</Text>
            <View className="flex-1">
              <Select
                value={slot.endTime}
                onChange={(endTime) => updateSlot(index, { endTime })}
                options={TIME_OPTIONS}
              />
            </View>
            <Pressable onPress={() => removeSlot(index)} hitSlop={8} className="pb-3">
              <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
            </Pressable>
          </View>
        </View>
      ))}

      <Button
        variant="outlined"
        color="neutral"
        size="sm"
        label="+ Agregar día"
        onPress={addSlot}
      />
    </View>
  );
}
