import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { useApiClient } from '@/lib/api';
import { useSetSessionAttendance } from '@/lib/mutations';
import { useClasses, useMe } from '@/lib/queries';
import { qk, qkRoot } from '@/lib/queryKeys';
import { dayOfWeekFromDate, todayYmd } from '@/utils/general';
import { cn } from '@/utils/cn';
import { theme } from '@/theme';

type RosterStudent = { id: string; name: string };

export default function ClassAttendanceScreen() {
  return (
    <RoleGuard screen="/class-attendance">
      <ClassAttendance />
    </RoleGuard>
  );
}

function ClassAttendance() {
  const api = useApiClient();
  const params = useLocalSearchParams<{ classId?: string }>();

  const [date, setDate] = useState(todayYmd());
  const [classId, setClassId] = useState(params.classId ?? '');
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: me } = useMe();
  const { data: classesData } = useClasses();

  const dow = dayOfWeekFromDate(date);

  const classes = useMemo(() => {
    const all = classesData ?? [];
    const mine = me?.role === 'TEACHER' ? all.filter((c) => c.teacherId === me.id) : all;
    return mine.filter((c) =>
      c.oneOffDate ? c.oneOffDate === date : c.slots?.some((s) => s.dayOfWeek === dow)
    );
  }, [classesData, me, date, dow]);

  // Selección efectiva: si la clase elegida no aplica a la fecha actual, se
  // trata como sin selección (sin mutar estado → sin efecto ni cascada).
  const effectiveClassId = classes.some((c) => c.id === classId) ? classId : '';

  const attKey = qk.sessionAttendance(effectiveClassId, date);
  const { data: attData, isLoading: attLoading } = useQuery<{ present: string[]; roster: RosterStudent[] }>({
    queryKey: attKey,
    queryFn: () =>
      api<{ present: string[]; roster: RosterStudent[] }>(
        `/api/v1/session-attendance?classId=${effectiveClassId}&date=${date}`,
      ),
    enabled: !!effectiveClassId,
  });

  const mutation = useSetSessionAttendance(effectiveClassId, date, {
    onMutate: ({ studentId }) => setSavingId(studentId),
    onSettled: () => setSavingId(null),
  });

  const present = new Set(attData?.present ?? []);
  const roster = attData?.roster ?? [];
  const refresh = usePullRefresh([qkRoot.classes, qkRoot.sessionAttendance]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header fijo: título, fecha y selector de clase. */}
      <View className="px-4 pt-6 gap-5">
        <Text className="text-2xl font-bold text-dark">Pasar Lista</Text>

        <Card>
          <Text className="text-sm font-medium text-dark mb-2">Fecha</Text>
          <DatePicker value={date} onChange={setDate} />
        </Card>

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
                    effectiveClassId === cls.id ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white',
                  )}
                >
                  <Text className={cn('text-sm font-medium', effectiveClassId === cls.id ? 'text-primary' : 'text-dark')}>
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>
      </View>

      {effectiveClassId &&
        (attLoading ? (
          <InlineSpinner />
        ) : (
          <FlatList
            data={roster}
            keyExtractor={(s) => s.id}
            refreshControl={refresh}
            contentContainerClassName="px-4 py-4 gap-3"
            ListHeaderComponent={
              roster.length > 0 ? (
                <View className="flex-row items-center justify-between pb-1">
                  <Text className="font-bold text-dark">Lista de asistencia</Text>
                  <Text className="text-sm text-gray-400">{present.size} / {roster.length}</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState message="No hay alumnos inscritos en esta clase." icon="person-outline" />
            }
            renderItem={({ item: student }) => {
              const isPresent = present.has(student.id);
              const saving = savingId === student.id;
              return (
                <TouchableOpacity
                  disabled={saving}
                  onPress={() => mutation.mutate({ studentId: student.id, present: isPresent })}
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
                    <Ionicons
                      name={isPresent ? 'checkmark' : 'remove'}
                      size={16}
                      color={isPresent ? '#ffffff' : theme.colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ))}
    </SafeAreaView>
  );
}
