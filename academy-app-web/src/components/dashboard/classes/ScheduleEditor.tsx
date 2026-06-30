import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { TimePicker } from '@/components/ui/TimePicker';

import { DAY_OPTIONS, type Slot } from './classes.types';

type ScheduleEditorProps = {
  value: Slot[];
  onChange: (slots: Slot[]) => void;
};

export function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  function update(index: number, patch: Partial<Slot>) {
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function add() {
    onChange([...value, { dayOfWeek: 1, startTime: '17:00', endTime: '18:00' }]);
  }
  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <span className="text-dark text-sm font-medium">Horario</span>

      {value.length === 0 && (
        <p className="text-xs text-gray-400">
          Sin horario. Agrega los días en que se imparte la clase.
        </p>
      )}

      {value.map((slot, i) => (
        <div key={i} className="flex items-center gap-2">
          <SelectMenu
            className="flex-1"
            value={String(slot.dayOfWeek)}
            onChange={(v) => update(i, { dayOfWeek: Number(v) })}
            options={DAY_OPTIONS.map((d) => ({
              value: String(d.value),
              label: d.label,
            }))}
          />
          <TimePicker
            className="w-28"
            value={slot.startTime}
            onChange={(v) => update(i, { startTime: v })}
          />
          <span className="text-gray-400">–</span>
          <TimePicker
            className="w-28"
            value={slot.endTime}
            onChange={(v) => update(i, { endTime: v })}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label="Quitar día"
            className="hover:text-danger p-2 text-gray-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="text"
        color="primary"
        onClick={add}
        className="h-auto p-0 text-sm font-semibold hover:bg-transparent"
      >
        <Plus className="h-4 w-4" /> Agregar día
      </Button>
    </div>
  );
}
