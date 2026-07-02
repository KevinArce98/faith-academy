import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function fromString(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(s: string): string {
  const d = fromString(s);
  if (!d) return '';
  return d.toLocaleDateString(theme.locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// 42 fechas (6 semanas × 7 días), lunes primero.
function calendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = startDow; i > 0; i--) days.push(new Date(year, month, 1 - i));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  let next = 1;
  while (days.length < 42) days.push(new Date(year, month + 1, next++));
  return days;
}

type DatePickerProps = {
  label?: string;
  placeholder?: string;
  /** Valor en formato "YYYY-MM-DD" */
  value: string;
  onChange: (value: string) => void;
};

export function DatePicker({ label, placeholder = 'Seleccionar fecha', value, onChange }: DatePickerProps) {
  const selected = fromString(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  function openPicker() {
    setViewYear(selected?.getFullYear() ?? today.getFullYear());
    setViewMonth(selected?.getMonth() ?? today.getMonth());
    setOpen(true);
  }

  function changeMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function selectDay(d: Date) {
    onChange(toString(d));
    setOpen(false);
  }

  const days = calendarDays(viewYear, viewMonth);

  return (
    <View className="gap-1.5">
      {label && <Text className="text-sm font-medium text-dark">{label}</Text>}

      <Pressable
        onPress={openPicker}
        className="h-12 flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-4"
      >
        <Text className={cn('text-base', selected ? 'text-dark' : 'text-gray-400')}>
          {selected ? formatDisplay(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={() => setOpen(false)}>
          <Pressable className="w-full max-w-sm rounded-2xl bg-surface p-4" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center justify-between px-1 pb-3">
              <Pressable onPress={() => changeMonth(-1)} hitSlop={8} className="p-1.5">
                <Ionicons name="chevron-back" size={18} color={theme.colors.textMuted} />
              </Pressable>
              <Text className="text-sm font-semibold text-dark">
                {MONTHS_ES[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={() => changeMonth(1)} hitSlop={8} className="p-1.5">
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <View className="flex-row">
              {DAYS_ES.map((d, i) => (
                <View key={i} className="flex-1 items-center py-1">
                  <Text className="text-[11px] font-semibold text-gray-400">{d}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {days.map((d, i) => {
                const inMonth = d.getMonth() === viewMonth;
                const isSelected = selected ? sameDay(d, selected) : false;
                const isToday = sameDay(d, today);
                return (
                  <View key={i} style={{ width: `${100 / 7}%` }} className="items-center py-0.5">
                    <Pressable
                      onPress={() => selectDay(d)}
                      className={cn(
                        'h-9 w-9 items-center justify-center rounded-full',
                        isSelected && 'bg-primary',
                        !isSelected && isToday && 'border border-primary',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-sm',
                          isSelected ? 'font-semibold text-white' : inMonth ? 'text-dark' : 'text-gray-300',
                          !isSelected && isToday && 'font-semibold text-primary',
                        )}
                      >
                        {d.getDate()}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Pressable onPress={() => selectDay(today)} className="mt-2 items-center py-2">
              <Text className="text-sm font-semibold text-primary">Hoy</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
