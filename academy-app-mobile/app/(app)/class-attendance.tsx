import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import type { MeResponse } from '@/lib/interfaces/auth';
import { dayOfWeekFromDate, todayYmd } from '@/utils/general';
import { cn } from '@/utils/cn';
import { theme } from '@/theme';

type Slot = { dayOfWeek: number };
type Cls = { id: string; name: string; teacherId: string; skillLevel: string; slots: Slot[]; oneOffDate?: string | null };
type RosterStudent = { id: string; name: string };

export default function ClassAttendance() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ classId?: string }>();

  const [date, setDate] = useState(todayYmd());
  const [classId, setClassId] = useState(params.classId ?? '');
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/v1/auth/me'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: classesData } = useQuery<{ classes: Cls[] }>({
    queryKey: ['classes'],
    queryFn: () => api<{ classes: Cls[] }>('/api/v1/classes'),
  });

  const dow = dayOfWeekFromDate(date);

  const classes = useMemo(() => {
    const all = classesData?.classes ?? [];
    const mine = me?.role === 'TEACHER' ? all.filter((c) => c.teacherId === me.id) : all;
    return mine.filter((c) =>
      c.oneOffDate ? c.oneOffDate === date : c.slots?.some((s) => s.dayOfWeek === dow)
    );
  }, [classesData, me, date, dow]);

  useEffect(() => {
    if (classId && !classes.some((c) => c.id === classId)) setClassId('');
  }, [classes, classId]);

  const attKey = ['session-attendance', classId, date] as const;
  const { data: attData, isLoading: attLoading } = useQuery<{ present: string[]; roster: RosterStudent[] }>({
    queryKey: attKey,
    queryFn: () =>
      api<{ present: string[]; roster: RosterStudent[] }>(
        `/api/v1/session-attendance?classId=${classId}&date=${date}`,
      ),
    enabled: !!classId,
  });

  const mutation = useMutation({
    mutationFn: ({ studentId, present }: { studentId: string; present: boolean }) =>
      api('/api/v1/session-attendance', {
        method: 'POST',
        body: JSON.stringify({ classId, date, studentId, present }),
      }),
    onMutate: ({ studentId }) => setSavingId(studentId),
    onSettled: async () => {
      setSavingId(null);
      await queryClient.invalidateQueries({ queryKey: attKey });
    },
  });

  const present = new Set(attData?.present ?? []);
  const roster = attData?.roster ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-5">
        <Text className="text-2xl font-bold text-dark">Pasar Lista</Text>

        {/* Date selector */}
        <Card>
          <Text className="text-sm font-medium text-dark mb-2">Fecha</Text>
          <Text className="text-base text-dark">{date}</Text>
        </Card>

        {/* Class selector */}
        <Card>
          <Text className="text-sm font-medium text-dark mb-2">Clase</Text>
          {classes.length === 0 ? (
            <Text className="text-sm text-gray-400">No hay clases para esta fecha.</Text>
          ) : (
            <View className="gap-2">
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => setClassId(cls.id)}
                  className={cn(
                    'px-3 py-2 rounded-lg border',
                    classId === cls.id ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white',
                  )}
                >
                  <Text className={cn('text-sm font-medium', classId === cls.id ? 'text-primary' : 'text-dark')}>
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Roster */}
        {classId && (
          attLoading ? (
            <InlineSpinner />
          ) : roster.length === 0 ? (
            <EmptyState message="No hay alumnos inscritos en esta clase." emoji="👤" />
          ) : (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-dark">Lista de asistencia</Text>
                <Text className="text-sm text-gray-400">{present.size} / {roster.length}</Text>
              </View>
              {roster.map((student) => {
                const isPresent = present.has(student.id);
                const saving = savingId === student.id;
                return (
                  <TouchableOpacity
                    key={student.id}
                    disabled={saving}
                    onPress={() => mutation.mutate({ studentId: student.id, present: !isPresent })}
                    className={cn(
                      'flex-row items-center gap-3 rounded-xl p-3 border',
                      isPresent ? 'bg-success/5 border-success/30' : 'bg-white border-gray-100',
                    )}
                  >
                    <Avatar name={student.name} size="sm" />
                    <Text className="flex-1 text-sm font-medium text-dark">{student.name}</Text>
                    <View className={cn(
                      'w-7 h-7 rounded-full items-center justify-center',
                      isPresent ? 'bg-success' : 'bg-gray-200',
                    )}>
                      <Text className="text-white text-xs font-bold">{isPresent ? '✓' : '—'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
