import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditClassSheet } from '@/components/dashboard/classes/EditClassSheet';
import { NewClassSheet } from '@/components/dashboard/classes/NewClassSheet';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineSpinner } from '@/components/ui/Spinner';
import { LEVEL_BADGE_CLS, LEVEL_LABELS, LEVEL_TEXT_CLS } from '@/components/ui/Badge';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import type { Cls } from '@/lib/interfaces/classes';
import { useAssignableTeachers, useClasses, useMe } from '@/lib/queries';
import { qkRoot } from '@/lib/queryKeys';
import { isAdmin } from '@/lib/roles';
import { theme } from '@/theme';
import { cn } from '@/utils/cn';
import { formatDateOnly } from '@/utils/general';
import { formatSlotRange } from '@/utils/schedule';

export default function ClassesScreen() {
  return (
    <RoleGuard screen="/classes">
      <Classes />
    </RoleGuard>
  );
}

function Classes() {
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Cls | null>(null);

  const { data: me } = useMe();
  const { data: classesData, isLoading } = useClasses();
  const { data: teachers } = useAssignableTeachers();

  const refresh = usePullRefresh([qkRoot.classes, qkRoot.assignableTeachers]);

  if (isLoading) return <SafeAreaView className="flex-1 bg-background"><InlineSpinner /></SafeAreaView>;

  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t.name ?? '—']));
  const role = me?.role ?? 'STUDENT';
  const userId = me?.id ?? '';
  const admin = isAdmin(role);

  const classes = (classesData ?? []).filter((c) => {
    if (role === 'TEACHER' && c.teacherId !== userId) return false;
    const term = search.toLowerCase();
    return !term || c.name.toLowerCase().includes(term);
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-6 gap-4">
        <Text className="text-2xl font-bold text-dark">Clases</Text>

        <TextInput
          className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-dark"
          placeholder="Buscar clase..."
          placeholderTextColor={theme.colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />

        {admin && (
          <Pressable
            onPress={() => setSheetOpen(true)}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3"
          >
            <Text className="text-lg text-primary">＋</Text>
            <Text className="text-sm font-semibold text-primary">Nueva clase</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={classes}
        keyExtractor={(cls) => cls.id}
        refreshControl={refresh}
        contentContainerClassName="px-4 py-4 gap-3"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: cls }) => (
          <Pressable disabled={!admin} onPress={() => setEditing(cls)}>
            <Card>
              <View className="flex-row items-start justify-between gap-2 mb-2">
                <Text className="font-bold text-dark text-base flex-1">{cls.name}</Text>
                <View className={cn('rounded-full px-2 py-0.5', LEVEL_BADGE_CLS[cls.skillLevel] ?? 'bg-gray-100')}>
                  <Text className={cn('text-[10px] font-bold uppercase', LEVEL_TEXT_CLS[cls.skillLevel] ?? 'text-gray-500')}>
                    {LEVEL_LABELS[cls.skillLevel] ?? cls.skillLevel}
                  </Text>
                </View>
              </View>

              {cls.oneOffDate ? (
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
                  <Text className="text-sm text-gray-500">
                    {formatDateOnly(cls.oneOffDate)}
                    {cls.slots?.[0] && ` · ${formatSlotRange(cls.slots[0].startTime, cls.slots[0].endTime)}`}
                  </Text>
                </View>
              ) : (
                cls.schedule && (
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                    <Text className="text-sm text-gray-500">{cls.schedule}</Text>
                  </View>
                )
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
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState message="No hay clases disponibles." icon="musical-notes-outline" />
        }
      />

      <NewClassSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        teachers={teachers ?? []}
      />
      <EditClassSheet
        cls={editing}
        onClose={() => setEditing(null)}
        teachers={teachers ?? []}
      />
    </SafeAreaView>
  );
}
