import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import type { TeacherProfile } from '@/lib/interfaces/teachers';
import { formatPrice } from '@/utils/general';
import { cn } from '@/utils/cn';

export default function Teachers() {
  const api = useApiClient();

  const { data, isLoading, isError } = useQuery<TeacherProfile[]>({
    queryKey: ['teachers'],
    queryFn: () => api<TeacherProfile[]>('/api/v1/teachers'),
  });

  if (isLoading) return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;
  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 pt-6">
        <Text className="text-sm text-danger">Error al cargar los profesores.</Text>
      </SafeAreaView>
    );
  }

  const active = data.filter((t) => t.isActive);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-dark">Profesores</Text>
          <Text className="text-sm text-gray-400">{active.length} activos</Text>
        </View>

        {data.length === 0 ? (
          <EmptyState message="No hay profesores registrados." emoji="🎓" />
        ) : (
          <View className="gap-3">
            {data.map((t) => (
              <Card key={t.id} className={cn(!t.isActive && 'opacity-60')}>
                <View className="flex-row items-center gap-3">
                  <Avatar name={t.name ?? t.email} />
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-semibold text-dark" numberOfLines={1}>{t.name ?? '—'}</Text>
                      {!t.isActive && (
                        <View className="rounded-full bg-gray-100 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-gray-400">INACTIVO</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-gray-400" numberOfLines={1}>{t.email}</Text>
                  </View>
                </View>

                {(t.hourlyRate != null || t.classes.length > 0) && (
                  <View className="mt-3 pt-3 border-t border-gray-100 flex-row items-center justify-between">
                    <Text className="text-sm text-gray-500">
                      {t.classes.length} {t.classes.length === 1 ? 'clase' : 'clases'}
                    </Text>
                    {t.hourlyRate != null && (
                      <Text className="text-sm font-medium text-dark">{formatPrice(t.hourlyRate)} / h</Text>
                    )}
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
