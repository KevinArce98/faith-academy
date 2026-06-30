import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { LEVEL_BADGE_CLS, LEVEL_LABELS, LEVEL_TEXT_CLS } from '@/components/ui/Badge';
import { useApiClient } from '@/lib/api';
import type { MeResponse } from '@/lib/interfaces/auth';
import { cn } from '@/utils/cn';

type Slot = { dayOfWeek: number; startTime: string; endTime: string };
type Cls = {
  id: string;
  name: string;
  skillLevel: string;
  schedule?: string | null;
  slots?: Slot[];
  teacherId: string;
  description?: string | null;
  maxCapacity?: number;
  isPrivate?: boolean;
  _count?: { attendances: number };
};
type AssignableTeacher = { id: string; name: string | null };

export default function Classes() {
  const api = useApiClient();
  const [search, setSearch] = useState('');

  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/v1/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: classesData, isLoading } = useQuery<{ classes: Cls[] }>({
    queryKey: ['classes'],
    queryFn: () => api<{ classes: Cls[] }>('/api/v1/classes'),
  });

  const { data: teachersData } = useQuery<{ teachers: AssignableTeacher[] }>({
    queryKey: ['assignable-teachers'],
    queryFn: () => api<{ teachers: AssignableTeacher[] }>('/api/v1/teachers/assignable'),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;

  const teacherMap = new Map((teachersData?.teachers ?? []).map((t) => [t.id, t.name ?? '—']));
  const role = me?.role ?? 'STUDENT';
  const userId = me?.id ?? '';

  const classes = (classesData?.classes ?? []).filter((c) => {
    if (role === 'TEACHER' && c.teacherId !== userId) return false;
    const term = search.toLowerCase();
    return !term || c.name.toLowerCase().includes(term);
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-4">
        <Text className="text-2xl font-bold text-dark">Clases</Text>

        <TextInput
          className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-dark"
          placeholder="Buscar clase..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />

        {classes.length === 0 ? (
          <EmptyState message="No hay clases disponibles." emoji="🎭" />
        ) : (
          <View className="gap-3">
            {classes.map((cls) => (
              <Card key={cls.id}>
                <View className="flex-row items-start justify-between gap-2 mb-2">
                  <Text className="font-bold text-dark text-base flex-1">{cls.name}</Text>
                  <View className={cn('rounded-full px-2 py-0.5', LEVEL_BADGE_CLS[cls.skillLevel] ?? 'bg-gray-100')}>
                    <Text className={cn('text-[10px] font-bold uppercase', LEVEL_TEXT_CLS[cls.skillLevel] ?? 'text-gray-500')}>
                      {LEVEL_LABELS[cls.skillLevel] ?? cls.skillLevel}
                    </Text>
                  </View>
                </View>

                {cls.schedule && (
                  <Text className="text-sm text-gray-500 mb-1">🕐 {cls.schedule}</Text>
                )}

                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-xs text-gray-400">Prof: {teacherMap.get(cls.teacherId) ?? '—'}</Text>
                  {cls._count != null && (
                    <Text className="text-xs text-gray-400">{cls._count.attendances} asistencias</Text>
                  )}
                </View>

                {cls.description && (
                  <Text className="text-xs text-gray-400 mt-1" numberOfLines={2}>{cls.description}</Text>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
