import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InlineSpinner } from '@/components/ui/Spinner';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { LEVEL_LABELS } from '@/components/ui/Badge';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { useAdminEnrollment } from '@/lib/mutations';
import { useClasses, useSubscriptions } from '@/lib/queries';
import { qk, qkRoot } from '@/lib/queryKeys';
import { theme } from '@/theme';
import { currentMonth, formatDateOnly, formatMonthYear } from '@/utils/general';
import { cn } from '@/utils/cn';

type AttendanceRecord = { studentId: string; classId: string; sessionDate: string | null };

export default function MonthlyAttendanceScreen() {
  return (
    <RoleGuard screen="/monthly-attendance">
      <MonthlyAttendance />
    </RoleGuard>
  );
}

function MonthlyAttendance() {
  const api = useApiClient();

  const [period] = useState(currentMonth());
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: classesData } = useClasses();
  const { data: subsData } = useSubscriptions(period);

  const attKey = qk.monthlyAttendance(period, classId);
  const { data: attData, isLoading: attLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: attKey,
    queryFn: () => api<{ records: AttendanceRecord[] }>(`/api/v1/monthly-attendance?period=${period}&classId=${classId}`),
    enabled: !!classId,
  });

  const mutation = useAdminEnrollment(period, classId, {
    onMutate: ({ studentId }) => { setError(null); setSavingId(studentId); },
    onError: (err) => setError(getErrorMessage(err, 'No se pudo actualizar.')),
    onSettled: () => setSavingId(null),
  });

  const classes = classesData ?? [];
  const attByStudent = new Map(
    (attData?.records ?? [])
      .filter((r) => r.classId === classId)
      .map((r) => [r.studentId, r] as const)
  );

  const students = useMemo(() => {
    const subs = subsData ?? [];
    const term = search.toLowerCase();
    return subs
      .filter((s) => s.isPaid)
      .filter((s) => !term || s.student.name.toLowerCase().includes(term) || s.student.email.toLowerCase().includes(term));
  }, [subsData, search]);

  const refresh = usePullRefresh([qkRoot.classes, qkRoot.subscriptions, qkRoot.monthlyAttendance]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header fijo: título, período, selector de clase y búsqueda. */}
      <View className="px-4 pt-6 gap-4">
        <View>
          <Text className="text-2xl font-bold text-dark">Asistencia Mensual</Text>
          <Text className="text-sm text-gray-400 capitalize">{formatMonthYear(period)}</Text>
        </View>

        <Card>
          <Text className="text-sm font-medium text-dark mb-2">Clase</Text>
          {classes.length === 0 ? (
            <Text className="text-sm text-gray-400">No hay clases.</Text>
          ) : (
            <View className="gap-1.5">
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => setClassId(cls.id)}
                  className={cn(
                    'px-3 py-2 rounded-lg border',
                    classId === cls.id ? 'border-primary bg-primary/5' : 'border-gray-200',
                  )}
                >
                  <Text className={cn('text-sm font-medium', classId === cls.id ? 'text-primary' : 'text-dark')}>
                    {cls.name}
                    <Text className="font-normal text-gray-400"> · {LEVEL_LABELS[cls.skillLevel] ?? cls.skillLevel}</Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {classId && (
          <TextInput
            className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-dark"
            placeholder="Buscar alumno..."
            placeholderTextColor={theme.colors.placeholder}
            value={search}
            onChangeText={setSearch}
          />
        )}

        {error && <ErrorBanner message={error} />}
      </View>

      {classId &&
        (attLoading ? (
          <InlineSpinner />
        ) : (
          <FlatList
            data={students}
            keyExtractor={(sub) => sub.studentId}
            refreshControl={refresh}
            contentContainerClassName="px-4 py-4 gap-3"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              students.length > 0 ? (
                <View className="flex-row items-center justify-between pb-1">
                  <Text className="font-bold text-dark">Alumnos</Text>
                  <Text className="text-sm text-gray-400">{attByStudent.size} inscritos</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState message="No hay alumnos con mensualidad activa." icon="person-outline" />
            }
            renderItem={({ item: sub }) => {
              const record = attByStudent.get(sub.studentId);
              const enrolled = !!record;
              const locked = !!record?.sessionDate;
              const saving = savingId === sub.studentId;
              return (
                <TouchableOpacity
                  disabled={saving || locked}
                  onPress={() => mutation.mutate({ studentId: sub.studentId, enrolled })}
                  className={cn(
                    'flex-row items-center gap-3 rounded-xl p-3 border',
                    enrolled ? 'bg-primary/5 border-primary/30' : 'bg-white border-gray-100',
                  )}
                >
                  <Avatar name={sub.student.name} size="sm" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-dark" numberOfLines={1}>{sub.student.name}</Text>
                    {locked && record?.sessionDate && (
                      <Text className="text-xs text-primary" numberOfLines={1}>
                        Solo esta clase · {formatDateOnly(record.sessionDate)}
                      </Text>
                    )}
                  </View>
                  {locked ? (
                    <Ionicons name="lock-closed" size={16} color={theme.colors.primary} />
                  ) : (
                    <View className={cn('w-7 h-7 rounded-full items-center justify-center', enrolled ? 'bg-primary' : 'bg-gray-200')}>
                      <Ionicons
                        name={enrolled ? 'checkmark' : 'add'}
                        size={16}
                        color={enrolled ? '#ffffff' : theme.colors.textMuted}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        ))}
    </SafeAreaView>
  );
}
