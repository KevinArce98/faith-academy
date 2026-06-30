import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InlineSpinner } from '@/components/ui/Spinner';
import { LEVEL_LABELS } from '@/components/ui/Badge';
import { useApiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { currentMonth } from '@/utils/general';
import { cn } from '@/utils/cn';

type Cls = { id: string; name: string; teacherId: string; skillLevel: string };
type StudentLite = { id: string; name: string; email: string };
type Subscription = {
  studentId: string;
  isPaid: boolean;
  amount: number;
  student: StudentLite;
};
type AttendanceRecord = { studentId: string; classId: string };

export default function MonthlyAttendance() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState(currentMonth());
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: classesData } = useQuery<{ classes: Cls[] }>({
    queryKey: ['classes'],
    queryFn: () => api<{ classes: Cls[] }>('/api/v1/classes'),
  });

  const { data: subsData } = useQuery<{ subscriptions: Subscription[] }>({
    queryKey: ['subscriptions', period],
    queryFn: () => api<{ subscriptions: Subscription[] }>(`/api/v1/subscriptions?period=${period}`),
  });

  const attKey = ['monthly-attendance', period, classId] as const;
  const { data: attData, isLoading: attLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: attKey,
    queryFn: () => api<{ records: AttendanceRecord[] }>(`/api/v1/monthly-attendance?period=${period}&classId=${classId}`),
    enabled: !!classId,
  });

  const mutation = useMutation({
    mutationFn: ({ studentId, enrolled }: { studentId: string; enrolled: boolean }) =>
      api('/api/v1/monthly-attendance', {
        method: enrolled ? 'DELETE' : 'POST',
        body: JSON.stringify({ classId, period, studentId }),
      }),
    onMutate: ({ studentId }) => { setError(null); setSavingId(studentId); },
    onError: (err) => setError(getErrorMessage(err, 'No se pudo actualizar.')),
    onSettled: async () => {
      setSavingId(null);
      await queryClient.invalidateQueries({ queryKey: attKey });
    },
  });

  const classes = classesData?.classes ?? [];
  const subs = subsData?.subscriptions ?? [];
  const attRecords = new Set(
    (attData?.records ?? []).filter((r) => r.classId === classId).map((r) => r.studentId)
  );

  const students = useMemo(() => {
    const term = search.toLowerCase();
    return subs
      .filter((s) => s.isPaid)
      .filter((s) => !term || s.student.name.toLowerCase().includes(term) || s.student.email.toLowerCase().includes(term));
  }, [subs, search]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-4">
        <Text className="text-2xl font-bold text-dark">Asistencia Mensual</Text>
        <Text className="text-sm text-gray-400">Período: {period}</Text>

        {/* Class selector */}
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
          <>
            <TextInput
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-dark"
              placeholder="Buscar alumno..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />

            {error && <ErrorBanner message={error} />}

            {attLoading ? (
              <InlineSpinner />
            ) : students.length === 0 ? (
              <EmptyState message="No hay alumnos con mensualidad activa." emoji="👤" />
            ) : (
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-bold text-dark">Alumnos</Text>
                  <Text className="text-sm text-gray-400">{attRecords.size} inscritos</Text>
                </View>
                {students.map((sub) => {
                  const enrolled = attRecords.has(sub.studentId);
                  const saving = savingId === sub.studentId;
                  return (
                    <TouchableOpacity
                      key={sub.studentId}
                      disabled={saving}
                      onPress={() => mutation.mutate({ studentId: sub.studentId, enrolled })}
                      className={cn(
                        'flex-row items-center gap-3 rounded-xl p-3 border',
                        enrolled ? 'bg-primary/5 border-primary/30' : 'bg-white border-gray-100',
                      )}
                    >
                      <Avatar name={sub.student.name} size="sm" />
                      <Text className="flex-1 text-sm font-medium text-dark" numberOfLines={1}>{sub.student.name}</Text>
                      <View className={cn('w-7 h-7 rounded-full items-center justify-center', enrolled ? 'bg-primary' : 'bg-gray-200')}>
                        <Text className="text-white text-xs font-bold">{enrolled ? '✓' : '+'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
