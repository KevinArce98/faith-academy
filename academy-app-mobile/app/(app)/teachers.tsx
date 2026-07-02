import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditTeacherSheet } from '@/components/dashboard/teachers/EditTeacherSheet';
import { NewTeacherSheet } from '@/components/dashboard/teachers/NewTeacherSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import type { TeacherProfile } from '@/lib/interfaces/teachers';
import { useRole, useTeachers } from '@/lib/queries';
import { qkRoot } from '@/lib/queryKeys';
import { isAdmin } from '@/lib/roles';
import { formatPrice } from '@/utils/general';
import { cn } from '@/utils/cn';

export default function TeachersScreen() {
  return (
    <RoleGuard screen="/teachers">
      <Teachers />
    </RoleGuard>
  );
}

function Teachers() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherProfile | null>(null);

  const admin = isAdmin(useRole());
  const { data, isLoading, isError } = useTeachers();

  const refresh = usePullRefresh([qkRoot.teachers]);

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
      <View className="px-4 pt-6 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-dark">Profesores</Text>
          <Text className="text-sm text-gray-400">{active.length} activos</Text>
        </View>

        {admin && (
          <Pressable
            onPress={() => setSheetOpen(true)}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3"
          >
            <Text className="text-lg text-primary">＋</Text>
            <Text className="text-sm font-semibold text-primary">Nuevo profesor</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={data}
        keyExtractor={(t) => t.id}
        refreshControl={refresh}
        contentContainerClassName="px-4 py-4 gap-3"
        renderItem={({ item: t }) => (
          <Pressable disabled={!admin} onPress={() => setEditing(t)}>
            <Card className={cn(!t.isActive && 'opacity-60')}>
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
                {admin && <Text className="text-gray-300">›</Text>}
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
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState message="No hay profesores registrados." icon="school-outline" />
        }
      />

      <NewTeacherSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
      <EditTeacherSheet teacher={editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}
