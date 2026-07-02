import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InlineSpinner } from '@/components/ui/Spinner';
import { LEVEL_BADGE_CLS, LEVEL_LABELS, LEVEL_TEXT_CLS } from '@/components/ui/Badge';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { getErrorMessage } from '@/lib/errorMessages';
import { useSelfEnrollment } from '@/lib/mutations';
import { useMyEnrollments, useStudentClasses } from '@/lib/queries';
import { qkRoot } from '@/lib/queryKeys';
import { theme } from '@/theme';
import { formatShortDate } from '@/utils/general';
import { cn } from '@/utils/cn';

export default function MyClassesScreen() {
  return (
    <RoleGuard screen="/my-classes">
      <MyClasses />
    </RoleGuard>
  );
}

function MyClasses() {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: classesData, isLoading: classesLoading } = useStudentClasses();
  const { data: enrollData, isLoading: enrollLoading } = useMyEnrollments();

  const mutation = useSelfEnrollment({
    onMutate: ({ classId }) => { setError(null); setSavingId(classId); },
    onError: (err) => setError(getErrorMessage(err, 'No se pudo actualizar la inscripción.')),
    onSettled: () => setSavingId(null),
  });

  const refresh = usePullRefresh([qkRoot.classes, qkRoot.myEnrollments]);

  if (classesLoading || enrollLoading) {
    return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  }

  const enrolled = new Set(enrollData?.enrolledClassIds ?? []);
  const active = enrollData?.active ?? false;
  const singleClass = enrollData?.singleClass ?? false;
  const allowance = enrollData?.allowance ?? null;
  const unlimited = active && allowance === null;
  const atLimit = active && allowance !== null && enrolled.size >= allowance;
  const classes = (classesData ?? []).filter((c) => !c.isPrivate);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        data={classes}
        keyExtractor={(cls) => cls.id}
        refreshControl={refresh}
        contentContainerClassName="px-4 py-6 gap-4"
        ListHeaderComponent={
          <View className="gap-4 mb-4">
            <View>
              <Text className="text-2xl font-bold text-dark">Mis Clases</Text>
              <Text className="mt-1 text-sm text-gray-400">
                {singleClass ? 'Tu clase suelta ya está reservada.' : 'Inscríbete en las clases que quieras tomar este mes.'}
              </Text>
            </View>

            {active && !singleClass && (
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-500">
                  {unlimited ? `${enrolled.size} inscritas · ilimitado` : `${enrolled.size} de ${allowance} usadas`}
                </Text>
                {enrollData?.expiresAt && (
                  <Text className="text-xs text-gray-400">Hasta {formatShortDate(enrollData.expiresAt)}</Text>
                )}
              </View>
            )}

            {!active && (
              <View className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 flex-row items-center justify-between gap-3">
                <Text className="text-sm font-medium text-warning flex-1">
                  {enrollData?.needsRenewal ? 'Tu plan ya no está activo. Renuévalo para inscribirte.' : 'Necesitas una mensualidad activa.'}
                </Text>
                <Button label="Renovar" size="sm" onPress={() => router.push('/(app)/payments')} />
              </View>
            )}

            {error && <ErrorBanner message={error} />}
          </View>
        }
        ListEmptyComponent={
          <EmptyState message="No hay clases disponibles por ahora." icon="musical-notes-outline" />
        }
        renderItem={({ item: cls }) => {
          const isEnrolled = enrolled.has(cls.id);
          const saving = savingId === cls.id;
          const blocked = !isEnrolled && (!active || atLimit);
          const locked = singleClass && isEnrolled;

          return (
            <Card className={cn(isEnrolled ? 'border-primary' : 'border-gray-100')}>
              <View className="flex-row items-start justify-between gap-2 mb-3">
                <Text className="font-bold text-dark flex-1">{cls.name}</Text>
                <View className={cn('rounded-full px-2 py-0.5', LEVEL_BADGE_CLS[cls.skillLevel] ?? 'bg-gray-100')}>
                  <Text className={cn('text-[10px] font-bold uppercase tracking-wide', LEVEL_TEXT_CLS[cls.skillLevel] ?? 'text-gray-500')}>
                    {LEVEL_LABELS[cls.skillLevel] ?? cls.skillLevel}
                  </Text>
                </View>
              </View>

              {cls.schedule && (
                <View className="flex-row items-center gap-1.5 mb-3">
                  <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                  <Text className="text-sm text-gray-500">{cls.schedule}</Text>
                </View>
              )}

              <Button
                label={locked ? 'Reservada' : isEnrolled ? 'Inscrito' : 'Inscribirme'}
                variant={isEnrolled ? 'outlined' : 'contained'}
                color={isEnrolled ? 'neutral' : 'primary'}
                loading={saving}
                disabled={saving || blocked || locked}
                onPress={() => mutation.mutate({ classId: cls.id, isEnrolled })}
                className="w-full"
              />
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}
