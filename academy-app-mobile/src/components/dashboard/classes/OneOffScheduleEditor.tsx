import { Text, View } from 'react-native';

import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';

import { TIME_OPTIONS } from './classes.types';

export type OneOffValue = {
  date: string;
  startTime: string;
  endTime: string;
};

type OneOffScheduleEditorProps = {
  value: OneOffValue;
  onChange: (value: OneOffValue) => void;
};

export function OneOffScheduleEditor({ value, onChange }: OneOffScheduleEditorProps) {
  return (
    <View className="gap-3">
      <DatePicker
        label="Fecha de la clase"
        value={value.date}
        onChange={(date) => onChange({ ...value, date })}
      />

      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <Select
            label="Inicio"
            value={value.startTime}
            onChange={(startTime) => onChange({ ...value, startTime })}
            options={TIME_OPTIONS}
          />
        </View>
        <Text className="pb-3 text-gray-400">–</Text>
        <View className="flex-1">
          <Select
            label="Fin"
            value={value.endTime}
            onChange={(endTime) => onChange({ ...value, endTime })}
            options={TIME_OPTIONS}
          />
        </View>
      </View>
    </View>
  );
}
